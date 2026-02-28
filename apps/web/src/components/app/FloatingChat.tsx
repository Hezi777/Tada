import { useEffect, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChat, type DashboardState } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface FloatingChatProps {
  datasetId: string | null;
  dashboardVersion: number;
  dashboardState: DashboardState | null;
  onDashboardUpdate: (next: DashboardState) => void;
}

export function FloatingChat({
  datasetId,
  dashboardVersion,
  dashboardState,
  onDashboardUpdate,
}: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const canChat = Boolean(datasetId);

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
        dashboardVersion,
        dashboardState: dashboardState ?? undefined,
      });
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      onDashboardUpdate(response.dashboardState);
    } catch (error) {
      let content = "Chat is unavailable right now. Make sure the API is running and HF_API_KEY is set.";
      if (error instanceof Error) {
        if (error.message === "missing_api_key") {
          content = "Chat needs HF_API_KEY. Set it for the API server, then try again.";
        } else if (error.message === "not_found" || error.message === "missing_rows") {
          content = "Your session expired on the server. Please re-upload the file.";
        } else if (error.message === "invalid_intent") {
          content = "Chat couldn't interpret that. Try: \"add a pie chart of <column>\".";
        } else if (error.message.startsWith("llm_error_")) {
          const code = error.message.replace("llm_error_", "");
          if (code === "401" || code === "403") {
            content = "The HF_API_KEY looks invalid. Update it and restart the API server.";
          } else if (code === "429") {
            content = "The LLM is rate limited. Wait a bit and try again.";
          } else if (code === "503") {
            content = "The model is warming up. Wait 30-60 seconds and try again.";
          } else if (code === "504") {
            content = "The LLM timed out. Try a shorter request or try again.";
          } else {
            content = "The LLM is unavailable right now. Try again shortly.";
          }
        } else if (error.message === "chat_failed") {
          content = "Chat failed on the server. Check the API logs for details.";
        } else if (error.message.includes("fetch")) {
          content = "Cannot reach the API server. Check VITE_API_BASE_URL and that the API is running.";
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
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-[1.7rem] border border-white/80 gradient-primary shadow-glow
          transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_hsl(var(--primary)/0.6)]
          focus:outline-none focus:ring-4 focus:ring-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0
          ${isOpen ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100"}
        `}
        aria-label="Open chat assistant"
        aria-expanded={isOpen}
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />
      </button>

      <div
        className={`
          fixed bottom-6 right-6 z-50 flex max-h-[680px] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-soft backdrop-blur-xl
          transition-all duration-300 ease-out origin-bottom-right motion-reduce:transition-none
          ${isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0"}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Chat with Tada Copilot"
      >
        <div className="border-b border-border/80 px-5 py-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] gradient-primary shadow-card">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-foreground">Tada Copilot</h3>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Ask anything about your data
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-10 w-10 focus:ring-2 focus:ring-primary/30"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-[320px] flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface)))] p-5">
          {!canChat && (
            <div className="rounded-[1.5rem] border border-white/80 bg-white/85 px-5 py-8 text-center text-sm text-muted-foreground shadow-card">
              Upload a file to chat about it.
            </div>
          )}
          {canChat && messages.length === 0 && (
            <div className="rounded-[1.5rem] border border-primary/15 bg-primary/[0.06] px-5 py-8 text-center text-sm text-muted-foreground shadow-card">
              Ask a question about your dataset to update the dashboard.
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`
                  max-w-[88%] rounded-[1.4rem] px-4 py-3 text-sm leading-7 shadow-card
                  ${message.role === "user"
                    ? "gradient-primary text-primary-foreground rounded-br-md"
                    : "border border-white/80 bg-white/90 text-foreground rounded-bl-md"}
                `}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-border/80 bg-white/80 p-4">
          <div className="flex items-center gap-2 rounded-[1.35rem] border border-white/80 bg-white/95 p-2 shadow-card">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSend()}
              placeholder={canChat ? "Ask about your data..." : "Upload a file to chat"}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Type your message"
              disabled={!canChat || isSending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!canChat || isSending || !input.trim()}
              className="h-11 w-11 rounded-[1rem]"
              aria-label="Send message"
            >
              {isSending ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
