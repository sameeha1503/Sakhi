import { useState, useEffect, useRef, type TouchEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Activity,
  Calendar,
  Flame,
  Clock,
  Stethoscope,
  ShieldAlert,
  Apple,
  Info,
} from "lucide-react";
import {
  AWARENESS_LAST_CARD_KEY,
  getOrderedAwarenessCards,
  type AwarenessCard,
  type AwarenessCardIcon,
} from "@/data/awarenessCards";
import { patternFlags } from "@/services/cycle";
import { logService, todayISO } from "@/services/logs";
import { storage } from "@/services/storage";

interface AwarenessCardsCarouselProps {
  onAskQuestion?: (query: string) => void;
  onClose?: () => void;
}

function CardIllustration({ icon }: { icon: AwarenessCardIcon }) {
  switch (icon) {
    case "pcos_what":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
          <Activity className="size-7" />
        </div>
      );
    case "pcos_signs":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent border border-accent/20 shadow-2xs">
          <Sparkles className="size-7" />
        </div>
      );
    case "endo_what":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-2xs">
          <Info className="size-7" />
        </div>
      );
    case "endo_signs":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-2xs">
          <Flame className="size-7" />
        </div>
      );
    case "cycle_normal":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-2xs">
          <Clock className="size-7" />
        </div>
      );
    case "when_doctor":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-2xs">
          <Stethoscope className="size-7" />
        </div>
      );
    case "urgent_care":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-2xs">
          <ShieldAlert className="size-7" />
        </div>
      );
    case "anemia_basics":
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-2xs">
          <Apple className="size-7" />
        </div>
      );
    default:
      return (
        <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground border border-border shadow-2xs">
          <Calendar className="size-7" />
        </div>
      );
  }
}

export function AwarenessCardsCarousel({ onAskQuestion, onClose }: AwarenessCardsCarouselProps) {
  const { t } = useTranslation();
  const [cards, setCards] = useState<AwarenessCard[]>([]);
  const [priorityCardId, setPriorityCardId] = useState<string | undefined>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Initialize cards and light personalization based on pattern flags
  useEffect(() => {
    const logs = logService.all();
    const today = todayISO();
    const flags = patternFlags(logs, today);
    const ordered = getOrderedAwarenessCards(flags);

    setCards(ordered.cards);
    setPriorityCardId(ordered.priorityCardId);

    // Read last viewed card from storage adapter (never raw localStorage)
    const savedCardId = storage.get<string | null>(AWARENESS_LAST_CARD_KEY, null);
    if (savedCardId) {
      const savedIndex = ordered.cards.findIndex((c) => c.id === savedCardId);
      if (savedIndex !== -1) {
        setCurrentIndex(savedIndex);
        return;
      }
    }
    setCurrentIndex(0);
  }, []);

  const goToCard = (index: number) => {
    if (index < 0 || index >= cards.length) return;
    setCurrentIndex(index);
    const card = cards[index];
    if (card) {
      storage.set(AWARENESS_LAST_CARD_KEY, card.id);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      goToCard(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      goToCard(currentIndex + 1);
    }
  };

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Touch swipe support
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped left -> next
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> prev
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (cards.length === 0) {
    return null;
  }

  const currentCard = cards[currentIndex] ?? cards[0];
  if (!currentCard) return null;

  const isPrioritized = currentCard.id === priorityCardId;

  return (
    <div
      className="flex flex-1 flex-col justify-between overflow-y-auto p-4 sm:p-5 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("awareness.tabTitle")}
    >
      {/* Top Card Content Area */}
      <div className="flex flex-col gap-3">
        {/* Personalized Notice Badge if flagged */}
        {isPrioritized ? (
          <div className="flex items-center gap-1.5 self-start rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground shadow-2xs border border-primary/20 animate-in fade-in">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span>{t("awareness.becauseYouLogged")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground">
            <span>
              {t("awareness.cardProgress", {
                current: currentIndex + 1,
                total: cards.length,
              })}
            </span>
          </div>
        )}

        {/* Card Body */}
        <div className="card-soft flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/90 p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-start gap-3.5">
            <CardIllustration icon={currentCard.iconName} />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold leading-snug text-foreground font-serif">
                {t(currentCard.titleKey)}
              </h3>
            </div>
          </div>

          <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-normal mt-1">
            {t(currentCard.bodyKey)}
          </p>

          {/* Optional Action Button (min 44px tap target) */}
          {currentCard.action && (
            <div className="mt-2 pt-2 border-t border-border/60">
              {currentCard.action.type === "ask" ? (
                <button
                  type="button"
                  onClick={() =>
                    onAskQuestion?.(
                      currentCard.action?.type === "ask" ? currentCard.action.query : "",
                    )
                  }
                  className="tap flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs sm:text-sm font-bold shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
                >
                  <MessageCircle className="size-4 shrink-0" />
                  <span>{t(currentCard.action.labelKey)}</span>
                </button>
              ) : (
                <Link
                  to={currentCard.action.to}
                  onClick={onClose}
                  className="tap flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-secondary-foreground border border-primary/20 px-4 py-2 text-xs sm:text-sm font-bold shadow-2xs hover:bg-secondary/80 active:scale-95 transition-all"
                >
                  <span>{t(currentCard.action.labelKey)}</span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls: Prev / Dots / Next */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="tap flex size-11 items-center justify-center rounded-xl border border-border/80 bg-background text-foreground shadow-2xs hover:bg-muted active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
            aria-label={t("awareness.prev")}
          >
            <ChevronLeft className="size-5" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 px-2" role="tablist" aria-label="Slides">
            {cards.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                onClick={() => goToCard(idx)}
                className={`tap rounded-full transition-all focus:outline-hidden focus:ring-2 focus:ring-primary ${
                  idx === currentIndex
                    ? "h-2 w-6 bg-primary"
                    : "size-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
                aria-label={t("awareness.cardProgress", {
                  current: idx + 1,
                  total: cards.length,
                })}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className="tap flex size-11 items-center justify-center rounded-xl border border-border/80 bg-background text-foreground shadow-2xs hover:bg-muted active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
            aria-label={t("awareness.next")}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Non-Diagnostic Card Footer Disclaimer */}
        <p className="text-center text-[11px] leading-normal text-muted-foreground px-2">
          {t("awareness.disclaimer")}
        </p>
      </div>
    </div>
  );
}
