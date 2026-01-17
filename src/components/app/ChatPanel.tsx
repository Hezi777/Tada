import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSendMessage?: (message: string) => void;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "I've analyzed your sales data and created this dashboard. What would you like to explore?",
  },
];

const quickActions = [
  "Show me top selling products",
  "Compare this month to last month",
  "What are the key trends?",
  "Add a pie chart for categories",
];

export function ChatPanel({ isExpanded, onToggleExpand, onSendMessage }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        "Show me top selling products": "Based on your data, the top 3 products are: Premium Widget ($45,200), Standard Pack ($32,100), and Deluxe Bundle ($28,400). I've highlighted these on the bar chart.",
        "Compare this month to last month": "Great question! This month shows 23% growth compared to last month. Revenue increased from $89,000 to $109,500. The biggest improvement was in the Electronics category.",
        "What are the key trends?": "I've identified 3 key trends: 1) Weekend sales are 40% higher than weekdays, 2) Product A shows consistent growth, and 3) There's a seasonal dip in mid-month.",
        "Add a pie chart for categories": "Done! I've added a category breakdown pie chart to your dashboard. Electronics leads at 35%, followed by Accessories at 28%.",
      };

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[input] || "I've updated the dashboard based on your request. The changes are now reflected in the visualizations above.",
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      onSendMessage?.(input);
    }, 1500);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => {
      setInput("");
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: action,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      setTimeout(() => {
        const responses: Record<string, string> = {
          "Show me top selling products": "Based on your data, the top 3 products are: Premium Widget ($45,200), Standard Pack ($32,100), and Deluxe Bundle ($28,400). I've highlighted these on the bar chart.",
          "Compare this month to last month": "Great question! This month shows 23% growth compared to last month. Revenue increased from $89,000 to $109,500. The biggest improvement was in the Electronics category.",
          "What are the key trends?": "I've identified 3 key trends: 1) Weekend sales are 40% higher than weekdays, 2) Product A shows consistent growth, and 3) There's a seasonal dip in mid-month.",
          "Add a pie chart for categories": "Done! I've added a category breakdown pie chart to your dashboard. Electronics leads at 35%, followed by Accessories at 28%.",
        };

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responses[action] || "I've updated the dashboard based on your request.",
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1500);
    }, 100);
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

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-1.5 text-xs rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your data..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="rounded-xl h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
