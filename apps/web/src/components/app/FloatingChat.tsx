import { useEffect, useState } from "react";
import { Send, Sparkles, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChat } from "@/lib/api";
import type { DashboardState } from "@tada/shared";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface FloatingChatProps {
  datasetId: string | null;
  dashboardVersion: number;
  onDashboardUpdate: (next: DashboardState) => void;
}

export function FloatingChat({ datasetId, dashboardVersion, onDashboardUpdate }: FloatingChatProps) {
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
      });
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      onDashboardUpdate(response.dashboardState);
    } catch {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "AI is limited right now, but the dashboard is still available.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-primary shadow-glow
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:scale-110 hover:shadow-[0_0_50px_-5px_hsl(var(--primary)/0.5)]
          focus:outline-none focus:ring-4 focus:ring-primary/30
          motion-reduce:transition-none motion-reduce:hover:scale-100
          ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}
        `}
        aria-label="Open chat assistant"
        aria-expanded={isOpen}
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Chat Panel */}
      <div
        className={`
          fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] rounded-2xl bg-card border border-border shadow-soft
          flex flex-col overflow-hidden
          transition-all duration-300 ease-out origin-bottom-right
          motion-reduce:transition-none
          ${isOpen 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
          }
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Chat with Tada Copilot"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Tada Copilot</h3>
              <p className="text-xs text-muted-foreground">Ask anything about your data</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(false)} 
            className="h-8 w-8 focus:ring-2 focus:ring-primary/30"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[380px]">
          {!canChat && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Upload a file to chat about it.
            </div>
          )}
          {canChat && messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Ask a question about your dataset to update the dashboard.
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[85%] px-4 py-3 rounded-2xl text-sm
                  ${message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                  }
                `}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSend()}
              placeholder={canChat ? "Ask about your data..." : "Upload a file to chat"}
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Type your message"
              disabled={!canChat || isSending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!canChat || isSending || !input.trim()}
              className="rounded-xl h-10 w-10 focus:ring-2 focus:ring-primary/30"
              aria-label="Send message"
            >
              {isSending ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
