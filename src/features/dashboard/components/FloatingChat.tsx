"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Send, Sparkles, WandSparkles, X } from "lucide-react";
import {
  BI_RULE_LIMITS,
  type ChatChartProposal,
  type ChatKpiValue,
} from "@/shared/contracts";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { Textarea } from "@/shared/ui/textarea";
import { sendChat } from "@/shared/lib/api";
import { computeKpiValue } from "@/features/dashboard/client/runtime";
import {
  applyChartProposal,
  applyChatbotPatch,
  useDashboardStore,
} from "@/features/dashboard/client/store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposal?: ChatChartProposal | null;
  proposalState?: "pending" | "accepted" | "dismissed";
}

const SUGGESTION_PROMPTS = [
  "Summarize the key trends in this data",
  "Which chart should I look at first?",
  "Add a chart comparing top categories",
];

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
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canChat = Boolean(datasetId);
  const prefersReducedMotion = useReducedMotion();

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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateIsMobile = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [input, isOpen]);

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
      if (response.patch) {
        applyChatbotPatch(response.patch);
        emitChartPulse(
          response.patch.action === "add"
            ? response.patch.config.id
            : response.patch.action === "remove"
              ? response.patch.chartId
              : response.patch.chartId,
        );
      }
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.assistantMessage,
        proposal: response.proposal,
        proposalState: response.proposal ? "pending" : undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      let content =
        "Tada Wiz is unavailable right now. Make sure the API is running.";
      if (error instanceof Error) {
        if (error.message === "not_found" || error.message === "missing_rows") {
          content =
            "Your session expired on the server. Please re-upload the file.";
        } else if (error.message === "chat_failed") {
          content =
            "Chat failed on the server. Check the API logs for details.";
        } else if (error.message.includes("fetch")) {
          content =
            "Cannot reach the server route. Check that the Next.js app is running and the request is reaching /api/chat.";
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

  const handleProposalAction = (
    messageId: string,
    action: "replace" | "hide_target" | "cancel",
  ) => {
    const targetMessage = messages.find((message) => message.id === messageId);
    const proposal = targetMessage?.proposal;
    if (!proposal) {
      return;
    }

    if (action === "cancel") {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, proposalState: "dismissed" }
            : message,
        ),
      );
      return;
    }

    if (
      action === "hide_target" &&
      chartConfigs.length >= BI_RULE_LIMITS.maxSavedCharts
    ) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content:
                  "I can replace a chart right now, but hidden views are already full.",
                proposalState: "dismissed",
              }
            : message,
        ),
      );
      return;
    }

    applyChartProposal(proposal, action);
    emitChartPulse(proposal.targetChartId ?? proposal.incomingConfig.id);
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content:
                action === "replace"
                  ? `Added ${proposal.incomingConfig.title} by replacing ${proposal.targetChartTitle ?? "the selected chart"}.`
                  : `Added ${proposal.incomingConfig.title} and moved ${proposal.targetChartTitle ?? "the selected chart"} to hidden views.`,
              proposalState: "accepted",
            }
          : message,
      ),
    );
  };

  const composer = (
    <div className="border-t border-[var(--color-border)] bg-card px-4 py-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Tada Wiz..."
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-[var(--color-accent)]"
          aria-label="Type your message"
          disabled={!canChat || isSending}
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canChat || isSending || !input.trim()}
          className="h-11 w-11 shrink-0 rounded-full border-0 bg-[linear-gradient(135deg,var(--color-accent)_0%,var(--color-accent-secondary)_100%)] text-white shadow-[0_10px_24px_-12px_rgba(0,50,125,0.6)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  const chatBody = (
    <>
      <ScrollArea className="dashboard-scroll flex-1 bg-card">
        <div className="space-y-4 px-4 py-4">
          {!canChat ? (
            <Card className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)] shadow-none">
              Upload a file to start chatting with Tada Wiz.
            </Card>
          ) : null}

          {canChat && messages.length === 0 ? (
            <div className="space-y-3">
              <Card className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)] shadow-none">
                Ask about your data, request a chart change, or get help reading
                a view.
              </Card>
              <div className="flex flex-wrap gap-2">
                {SUGGESTION_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-[var(--color-border)] bg-card px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "rounded-[12px_12px_2px_12px] bg-[var(--color-accent)] text-white"
                    : "rounded-[12px_12px_12px_2px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]"
                }`}
              >
                {message.content}
                {message.role === "assistant" &&
                message.proposal &&
                message.proposalState === "pending" ? (
                  <div className="mt-3 rounded-[20px] bg-[var(--color-surface-muted)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Proposed change
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                      Add {message.proposal.incomingConfig.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      This will replace{" "}
                      {message.proposal.targetChartTitle ?? "a chart"}.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-full bg-[var(--color-accent)] px-3 text-xs text-white hover:bg-[var(--color-accent-secondary)]"
                        onClick={() =>
                          handleProposalAction(message.id, "replace")
                        }
                      >
                        Replace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() =>
                          handleProposalAction(message.id, "hide_target")
                        }
                        disabled={
                          chartConfigs.length >= BI_RULE_LIMITS.maxSavedCharts
                        }
                      >
                        Hide current instead
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() =>
                          handleProposalAction(message.id, "cancel")
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {isSending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-[12px_12px_12px_2px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]"
                    style={{
                      animation: `wizDot 1s ease-in-out ${index * 0.12}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <Separator className="bg-transparent" />

      {composer}
    </>
  );

  return (
    <>
      <style>{`
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
          className="relative h-[52px] w-[52px] rounded-full border-0 bg-[linear-gradient(135deg,var(--color-accent)_0%,var(--color-accent-secondary)_100%)] text-white shadow-[0_18px_36px_-18px_rgba(0,50,125,0.55)] transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-[0_22px_40px_-18px_rgba(0,50,125,0.65)]"
          aria-label={isOpen ? "Close Tada Wiz" : "Open Tada Wiz"}
          aria-expanded={isOpen}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                className="flex h-5 w-5 items-center justify-center"
                initial={
                  prefersReducedMotion ? false : { opacity: 0, rotate: -90 }
                }
                animate={{ opacity: 1, rotate: 0 }}
                exit={
                  prefersReducedMotion ? undefined : { opacity: 0, rotate: 90 }
                }
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                className="flex h-5 w-5 items-center justify-center"
                initial={
                  prefersReducedMotion ? false : { opacity: 0, rotate: 90 }
                }
                animate={{ opacity: 1, rotate: 0 }}
                exit={
                  prefersReducedMotion ? undefined : { opacity: 0, rotate: -90 }
                }
                transition={{ duration: 0.15 }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="mt-0 h-[85vh] overflow-hidden rounded-t-[24px] border-0 bg-card p-0 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]">
            <DrawerHeader className="bg-[linear-gradient(145deg,var(--color-accent)_0%,var(--color-accent-secondary)_100%)] px-5 py-4 text-left text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <WandSparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <DrawerTitle className="text-base font-bold text-white">
                      Tada Wiz
                    </DrawerTitle>
                    <DrawerDescription className="mt-0.5 text-[13px] text-white/75">
                      Ask anything about your data
                    </DrawerDescription>
                  </div>
                </div>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white"
                    aria-label="Close Tada Wiz"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col">{chatBody}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              key="wiz-panel"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 10, scale: 0.95 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 10, scale: 0.95 }
              }
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-24 right-6 z-50 h-[500px] w-[380px] overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-card shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
            >
              <div className="flex h-full flex-col">
                <div className="bg-[linear-gradient(145deg,var(--color-accent)_0%,var(--color-accent-secondary)_100%)] px-5 py-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                        <WandSparkles className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="text-base font-bold">Tada Wiz</div>
                        <p className="mt-0.5 text-[13px] text-white/75">
                          Ask anything about your data
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white"
                      aria-label="Close Tada Wiz"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">{chatBody}</div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </>
  );
}
