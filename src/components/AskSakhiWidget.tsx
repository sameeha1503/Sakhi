import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  Flower2,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { askSakhi, chatStorage, type ChatMessage } from "@/services/chat";
import { storage } from "@/services/storage";

const TOOLTIP_SEEN_KEY = "chat_tooltip_seen";

export function AskSakhiWidget() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Initialize from storage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = chatStorage.getHistory();
    if (saved && saved.length > 0) {
      setMessages(saved);
    }

    const tooltipSeen = storage.get(TOOLTIP_SEEN_KEY, false);
    if (!tooltipSeen) {
      setShowTooltip(true);
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus trap & Esc listener
  useEffect(() => {
    if (!isOpen) return;

    // Focus input on open
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSendRef = useRef<(text?: string) => Promise<void>>(undefined);

  // Global event listener for opening chat widget from pattern flags or other modules
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onAskSakhi = (e: Event) => {
      const detail = (e as CustomEvent<{ query?: string }>).detail;
      setIsOpen(true);
      if (showTooltip) {
        setShowTooltip(false);
        storage.set(TOOLTIP_SEEN_KEY, true);
      }
      if (detail?.query) {
        handleSendRef.current?.(detail.query);
      }
    };

    window.addEventListener("ask-sakhi", onAskSakhi);
    return () => window.removeEventListener("ask-sakhi", onAskSakhi);
  }, [showTooltip]);

  const handleOpen = () => {
    setIsOpen(true);
    if (showTooltip) {
      setShowTooltip(false);
      storage.set(TOOLTIP_SEEN_KEY, true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClear = () => {
    chatStorage.clearHistory();
    setMessages([]);
  };

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : input;
    const query = rawText.trim();
    if (!query || isTyping) return;

    setInput("");

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: "user",
      text: query,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    chatStorage.saveHistory(newHistory);

    setIsTyping(true);

    try {
      const response = await askSakhi(newHistory, i18n.language || "en");

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: "assistant",
        text: response.text,
        source: response.source,
        actions: response.actions,
        timestamp: new Date().toISOString(),
      };

      const finalHistory = [...newHistory, botMsg];
      setMessages(finalHistory);
      chatStorage.saveHistory(finalHistory);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `bot_${Date.now()}_fallback`,
        sender: "assistant",
        text: t("chat.fallback"),
        timestamp: new Date().toISOString(),
      };
      const finalHistory = [...newHistory, fallbackMsg];
      setMessages(finalHistory);
      chatStorage.saveHistory(finalHistory);
    } finally {
      setIsTyping(false);
    }
  };
  handleSendRef.current = handleSend;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const suggestionChips = [
    { key: "pcos", textKey: "chat.chips.pcos" },
    { key: "endometriosis", textKey: "chat.chips.endometriosis" },
    { key: "cycleNormal", textKey: "chat.chips.cycleNormal" },
    { key: "whenDoctor", textKey: "chat.chips.whenDoctor" },
    { key: "howToLog", textKey: "chat.chips.howToLog" },
    { key: "findHospital", textKey: "chat.chips.findHospital" },
    { key: "govtSchemes", textKey: "chat.chips.govtSchemes" },
    { key: "shareRecords", textKey: "chat.chips.shareRecords" },
    { key: "privacy", textKey: "chat.chips.privacy" },
  ];

  return (
    <>
      {/* Floating Trigger Button: Fixed above bottom navigation on all screens */}
      <aside
        aria-label={t("chat.title")}
        className="fixed bottom-20 sm:bottom-22 right-4 sm:right-6 z-40 flex flex-col items-end"
      >
        {/* First-visit Tooltip Speech Bubble */}
        {showTooltip && !isOpen && (
          <div className="relative mb-2.5 flex items-center gap-2 rounded-2xl bg-foreground px-3.5 py-2 text-xs font-semibold text-background shadow-lg animate-bounce">
            <Sparkles className="size-3.5 text-secondary shrink-0" />
            <span>{t("chat.tooltip")}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
                storage.set(TOOLTIP_SEEN_KEY, true);
              }}
              className="tap -mr-1 rounded-full p-1 text-background/70 hover:text-background"
              aria-label={t("chat.close")}
            >
              <X className="size-3" />
            </button>
            {/* Arrow tail */}
            <div className="absolute -bottom-1.5 right-6 size-3 rotate-45 bg-foreground" />
          </div>
        )}

        <button
          onClick={handleOpen}
          className="tap relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-primary/30"
          aria-label={t("chat.title")}
          aria-expanded={isOpen}
        >
          <MessageCircle className="size-7" />
          <span className="sr-only">{t("chat.title")}</span>
        </button>
      </aside>

      {/* Chat Panel: Bottom Sheet on mobile, 380px anchored panel on desktop */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("chat.title")}
          ref={dialogRef}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] max-h-[620px] flex-col rounded-t-3xl border-t border-border bg-card shadow-2xl animate-in slide-in-from-bottom duration-250 md:inset-x-auto md:bottom-6 md:right-6 md:h-[580px] md:w-[380px] md:rounded-3xl md:border md:shadow-2xl"
        >
          {/* Mobile Sheet Handle */}
          <div className="flex justify-center pt-2.5 pb-1 md:hidden">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <header className="flex items-center justify-between border-b border-border/80 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
                <Flower2 className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight text-foreground">
                  {t("chat.title")}
                </span>
                <span className="text-[11px] font-medium leading-none text-muted-foreground">
                  {t("chat.subtitle")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="tap flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-colors"
                title={t("chat.clear")}
                aria-label={t("chat.clear")}
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={handleClose}
                className="tap flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-colors"
                title={t("chat.close")}
                aria-label={t("chat.close")}
              >
                <X className="size-5" />
              </button>
            </div>
          </header>

          {/* Permanent Disclaimer Banner */}
          <div className="border-b border-border/50 bg-muted/60 px-3.5 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
            {t("chat.disclaimer")}
          </div>

          {/* Message History & Chips */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            aria-live="polite"
            aria-atomic="false"
          >
            {/* Initial Welcome Greeting & Chips */}
            {messages.length === 0 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2 max-w-[90%]">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Flower2 className="size-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs border border-border/70 bg-muted px-3.5 py-2.5 text-xs md:text-sm text-foreground shadow-2xs leading-relaxed">
                    {t("chat.greeting")}
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 px-1">
                    {t("chat.chipsLabel", { defaultValue: "Common Questions" })}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip.key}
                        onClick={() => handleSend(t(chip.textKey))}
                        className="tap flex min-h-11 items-center gap-1.5 rounded-xl border border-primary/20 bg-secondary/80 px-3 py-2 text-left text-xs font-semibold text-secondary-foreground hover:bg-secondary active:scale-95 transition-all"
                      >
                        <Sparkles className="size-3 text-primary shrink-0" />
                        <span>{t(chip.textKey)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-xs md:text-sm shadow-2xs leading-relaxed ${
                    msg.sender === "user"
                      ? "rounded-2xl rounded-tr-xs bg-primary text-primary-foreground font-medium"
                      : "rounded-2xl rounded-tl-xs border border-border/70 bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Assistant Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                    {msg.actions.map((act) => (
                      <Link
                        key={act.to}
                        to={act.to}
                        onClick={handleClose}
                        className="tap flex min-h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                      >
                        <span>{act.label}</span>
                        <ArrowRight className="size-3 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground text-xs font-medium">
                <div className="size-2 rounded-full bg-primary animate-pulse" />
                <div className="size-2 rounded-full bg-primary animate-pulse [animation-delay:200ms]" />
                <div className="size-2 rounded-full bg-primary animate-pulse [animation-delay:400ms]" />
                <span className="ml-1 text-[11px]">{t("chat.typing")}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips Footer if in ongoing chat */}
          {messages.length > 0 && (
            <div className="border-t border-border/40 px-3 py-1.5 overflow-x-auto flex gap-1.5 scrollbar-none bg-background/50">
              {suggestionChips.slice(0, 4).map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => handleSend(t(chip.textKey))}
                  className="tap whitespace-nowrap text-[11px] font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/15 rounded-lg px-2.5 py-1 transition-colors"
                >
                  {t(chip.textKey)}
                </button>
              ))}
            </div>
          )}

          {/* Input Form with 44px tap targets */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-border bg-card p-3 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.inputPlaceholder")}
              maxLength={500}
              className="flex-1 min-h-11 rounded-xl border border-input bg-background px-3.5 py-2 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="tap flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 disabled:opacity-40 transition-all"
              aria-label={t("chat.send")}
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
