import { useEffect, useState } from "react";
import { MessageCircle, Send, Sparkles, WandSparkles, X } from "lucide-react";
import type { ChatKpiValue } from "@tada/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { sendChat } from "@/lib/api";
import { computeKpiValue } from "@/lib/dashboard-runtime";
import { applyChatbotPatch, useDashboardStore } from "@/lib/dashboard-store";

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
      let content = "TADA Wiz is unavailable right now. Make sure the API is running.";
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
    <>
      <style>{`
        @keyframes wizOpen {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wizDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* FAB with pulse ring */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <span className="fab-pulse-ring absolute inset-0 rounded-full" />
        )}
        <Button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="relative h-14 w-14 rounded-full border-0 bg-[#3B82F6] text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)] transition-all duration-200 ease-in-out hover:scale-105 hover:bg-[#2563EB] hover:shadow-[0_6px_28px_rgba(59,130,246,0.45)]"
          aria-label={isOpen ? "Close TADA Wiz" : "Open TADA Wiz"}
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </div>

      {isOpen ? (
        <div
          className="fixed bottom-24 right-6 z-50 h-[500px] w-[380px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
          style={{ animation: "wizOpen 200ms ease" }}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <WandSparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-base font-bold">TADA Wiz</div>
                    <p className="mt-0.5 text-[13px] text-white/75">Ask anything about your data</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white"
                  aria-label="Close TADA Wiz"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="dashboard-scroll flex-1 bg-white">
              <div className="space-y-4 px-4 py-4">
                {!canChat ? (
                  <Card className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)] shadow-none">
                    Upload a file to start chatting with TADA Wiz.
                  </Card>
                ) : null}

                {canChat && messages.length === 0 ? (
                  <Card className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)] shadow-none">
                    Ask about your data, request a chart change, or get help reading a view.
                  </Card>
                ) : null}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] px-4 py-3 text-sm leading-6 ${message.role === "user"
                          ? "rounded-[12px_12px_2px_12px] bg-[#3B82F6] text-white"
                          : "rounded-[12px_12px_12px_2px] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                        }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {isSending ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-[12px_12px_12px_2px] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]"
                          style={{ animation: `wizDot 1s ease-in-out ${index * 0.12}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>

            <Separator className="bg-[var(--color-border)]" />

            {/* Input */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSend()}
                  placeholder="Ask TADA Wiz..."
                  className="h-11 flex-1 rounded-xl border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                  aria-label="Type your message"
                  disabled={!canChat || isSending}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!canChat || isSending || !input.trim()}
                  className="h-9 w-9 rounded-full bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                  aria-label="Send message"
                >
                  {isSending ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
