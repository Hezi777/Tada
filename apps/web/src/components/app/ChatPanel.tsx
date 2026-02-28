import { useEffect, useState } from "react";
import { Send, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChat, type DashboardState } from "@/lib/api";

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
    } catch (error) {
      let content = "Chat is unavailable right now. Make sure the API is running and HF_API_KEY is set.";
      if (error instanceof Error) {
        if (error.message === "missing_api_key") {
          content = "Chat needs HF_API_KEY. Set it for the API server, then try again.";
        } else if (error.message === "not_found" || error.message === "missing_rows") {
          content = "Your session expired on the server. Please re-upload the file.";
        } else if (error.message === "invalid_intent") {
          content = "Chat couldn't interpret that. Try: “add a pie chart of <column>”.";
        } else if (error.message.startsWith("llm_error_")) {
          const code = error.message.replace("llm_error_", "");
          if (code === "401" || code === "403") {
            content = "The HF_API_KEY looks invalid. Update it and restart the API server.";
          } else if (code === "429") {
            content = "The LLM is rate limited. Wait a bit and try again.";
          } else if (code === "503") {
            content = "The model is warming up. Wait 30–60 seconds and try again.";
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
    <div className={`
      flex flex-col border-l border-white/80 bg-white/90 backdrop-blur-xl transition-all duration-300
      ${isExpanded ? 'w-[420px]' : 'w-[340px]'}
    `}>
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] gradient-primary shadow-card">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-foreground">Tada Copilot</h3>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ask anything about your data</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-10 w-10">
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface)))] p-4">
        {!canChat && (
          <div className="rounded-[1.5rem] border border-white/80 bg-white/85 py-6 text-center text-sm text-muted-foreground shadow-card">
            Upload a file to chat about it.
          </div>
        )}
        {canChat && messages.length === 0 && (
          <div className="rounded-[1.5rem] border border-primary/15 bg-primary/[0.06] py-6 text-center text-sm text-muted-foreground shadow-card">
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
                  ? "gradient-primary text-primary-foreground rounded-br-md shadow-card"
                  : "border border-white/80 bg-white/90 text-foreground rounded-bl-md shadow-card"
                }
              `}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border/80 bg-white/80 p-4">
        <div className="flex items-center gap-2 rounded-[1.35rem] border border-white/80 bg-white/95 p-2 shadow-card">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSend()}
            placeholder={canChat ? "Ask about your data..." : "Upload a file to chat"}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={!canChat || isSending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canChat || isSending || !input.trim()}
            className="h-11 w-11 rounded-[1rem]"
          >
            {isSending ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
