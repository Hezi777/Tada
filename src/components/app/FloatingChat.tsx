import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface FloatingChatProps {
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

export function FloatingChat({ onSendMessage }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
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
          <div className="px-4 pb-3 shrink-0">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="px-3 py-1.5 text-xs rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 motion-reduce:transition-none"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your data..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Type your message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-xl h-10 w-10 focus:ring-2 focus:ring-primary/30"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
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
