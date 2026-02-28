import { useEffect, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import type { ChatKpiValue } from "@tada/shared";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendChat } from "@/lib/api";
import { computeKpiValue } from "@/lib/dashboard-runtime";
import {
  applyChatbotPatch,
  useDashboardStore,
} from "@/lib/dashboard-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function emitChartPulse(chartId: string | undefined): void {
  if (!chartId || typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("tada:chart-pulse", {
      detail: { chartId },
    }),
  );
}

export function FloatingChat() {
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const chartConfigs = useDashboardStore((snapshot) => snapshot.charts);
  const kpiConfigs = useDashboardStore((snapshot) => snapshot.kpis);
  const rows = useDashboardStore((snapshot) => snapshot.rows);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const canChat = Boolean(datasetId);
  const liveKpis: ChatKpiValue[] = kpiConfigs.map((kpi) => ({
    id: kpi.id,
    column: kpi.column,
    aggregation: kpi.aggregation,
    label: kpi.label,
    isPrimary: kpi.isPrimary,
    value: computeKpiValue(kpi, rows),
  }));

  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsSending(false);
  }, [datasetId]);

  const handleSend = async () => {
    if (!input.trim() || !datasetId || isSending) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await sendChat({
        datasetId,
        message: userMessage.content,
        chartConfigs,
        kpis: liveKpis,
      });
      applyChatbotPatch(response.patch);
      emitChartPulse(
        response.patch?.action === "add"
          ? response.patch.config.id
          : response.patch?.action === "remove"
            ? response.patch.chartId
            : response.patch?.chartId,
      );
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      let content = "Chat is unavailable right now. Make sure the API is running.";
      if (error instanceof Error) {
        if (error.message === "not_found" || error.message === "missing_rows") {
          content = "Your session expired on the server. Please re-upload the file.";
        } else if (error.message === "chat_failed") {
          content = "Chat failed on the server. Check the API logs for details.";
        } else if (error.message.includes("fetch")) {
          content = "Cannot reach the API server. Check VITE_API_BASE_URL and that the API is running.";
        } else {
          content = error.message;
        }
      }
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent)] text-white shadow-[var(--dashboard-shadow-lg)] transition-all duration-150 hover:bg-[var(--color-accent-hover)] ${isOpen ? "pointer-events-none scale-95 opacity-0" : "opacity-100"}`}
          aria-label="Open chat assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-[min(30rem,calc(100vw-1rem))] max-w-none flex-col gap-0 border-l-[var(--color-border)] bg-[var(--color-bg)] p-0 text-[var(--color-text-primary)] shadow-[var(--dashboard-shadow-lg)] lg:w-[30rem]"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-[var(--color-border)] bg-white px-6 py-5 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Tada Copilot
                </SheetTitle>
                <SheetDescription className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Edit dashboard views conversationally.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--color-bg)] px-5 py-5">
            {!canChat && (
              <Card className="dashboard-surface rounded-3xl px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
                Upload a file to chat about it.
              </Card>
            )}
            {canChat && messages.length === 0 && (
              <Card className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-accent-light)] px-5 py-8 text-center text-sm text-[var(--color-text-muted)] shadow-sm">
                Ask for a chart edit, a new view, or a more specific framing of an insight.
              </Card>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-7 ${
                    message.role === "user"
                      ? "bg-[var(--color-accent)] text-white"
                      : "border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--color-border)] bg-white p-4">
            <Card className="dashboard-surface flex items-center gap-2 rounded-[1.35rem] p-2">
              <Input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSend()}
                placeholder={canChat ? "Ask to edit a chart..." : "Upload a file to chat"}
                className="flex-1 border-0 bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Type your message"
                disabled={!canChat || isSending}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!canChat || isSending || !input.trim()}
                className="h-11 w-11 rounded-[1rem] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"
                aria-label="Send message"
              >
                {isSending ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
