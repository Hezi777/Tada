import { useEffect, useState } from "react";
import { Send, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChat } from "@/lib/api";
import type { DashboardState } from "@tada/shared";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  datasetId: string | null;
  dashboardVersion: number;
  onDashboardUpdate: (next: DashboardState) => void;
}

export function ChatPanel({
  isExpanded,
  onToggleExpand,
  datasetId,
  dashboardVersion,
  onDashboardUpdate,
}: ChatPanelProps) {
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
    <div className={`
      flex flex-col bg-card border-l border-border transition-all duration-300
      ${isExpanded ? 'w-[420px]' : 'w-[340px]'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">TADA Copilot</h3>
            <p className="text-xs text-muted-foreground">Ask anything about your data</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-8 w-8">
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!canChat && (
          <div className="text-sm text-muted-foreground text-center py-6">
            Upload a file to chat about it.
          </div>
        )}
        {canChat && messages.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
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
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSend()}
            placeholder={canChat ? "Ask about your data..." : "Upload a file to chat"}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={!canChat || isSending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canChat || isSending || !input.trim()}
            className="rounded-xl h-10 w-10"
          >
            {isSending ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
