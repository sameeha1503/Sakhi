import * as React from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, setAppLanguage, type LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface LanguageSelectProps {
  className?: string;
  triggerClassName?: string;
  variant?: "header" | "landing" | "settings";
  onLanguageChange?: (code: string) => void;
}

export function LanguageSelect({
  className,
  triggerClassName,
  variant = "header",
  onLanguageChange,
}: LanguageSelectProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [currentCode, setCurrentCode] = React.useState<string>(i18n.language || "en");

  React.useEffect(() => {
    const handler = (lng: string) => {
      setCurrentCode(lng);
    };
    i18n.on("languageChanged", handler);
    setCurrentCode(i18n.language || "en");
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  const currentLang = React.useMemo(() => {
    return (
      LANGUAGES.find((l) => l.code === currentCode) ||
      LANGUAGES.find((l) => l.code === "en") ||
      LANGUAGES[0]
    );
  }, [currentCode]);

  const handleSelect = async (code: string) => {
    setOpen(false);
    await setAppLanguage(code);
    setCurrentCode(code);
    if (onLanguageChange) {
      onLanguageChange(code);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={t("lang.title") || "Select language"}
          className={cn(
            "group flex items-center justify-between gap-2.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer select-none",
            variant === "header" &&
              "h-10 min-h-[44px] rounded-xl border border-border bg-card/90 px-3 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:bg-muted/80 hover:border-primary/40",
            variant === "landing" &&
              "h-14 min-h-[56px] w-full rounded-2xl border-2 border-border/90 bg-card px-4 text-base sm:text-lg font-bold text-foreground shadow-xs hover:border-primary/60 hover:bg-secondary/20",
            variant === "settings" &&
              "h-14 min-h-[56px] w-full rounded-2xl border-2 border-border bg-card px-4 text-base sm:text-lg font-bold text-foreground shadow-xs hover:border-primary/60 hover:bg-secondary/20",
            triggerClassName,
            className,
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe
              className={cn(
                "shrink-0 text-primary transition-transform group-hover:scale-110",
                variant === "header" ? "size-4" : "size-5",
              )}
            />
            <span className="truncate font-semibold text-foreground">{currentLang.label}</span>
          </div>
          <ChevronDown
            className={cn(
              "shrink-0 text-muted-foreground transition-transform duration-200",
              variant === "header" ? "size-3.5" : "size-4",
              open && "rotate-180 text-primary",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={variant === "header" ? "end" : "center"}
        sideOffset={6}
        className="w-[calc(100vw-2rem)] max-w-sm sm:w-80 p-0 rounded-2xl border-2 border-border shadow-2xl z-50 overflow-hidden bg-card"
      >
        <Command className="rounded-2xl">
          <CommandInput placeholder="Search language / भाषा खोजें..." className="h-12 text-sm" />
          <CommandList className="max-h-72 p-1.5 scroll-py-1">
            <CommandEmpty className="p-4 text-center text-sm text-muted-foreground">
              No language found.
            </CommandEmpty>
            <CommandGroup>
              {LANGUAGES.map((l) => {
                const isSelected = currentCode === l.code;
                return (
                  <CommandItem
                    key={l.code}
                    value={`${l.label} ${l.englishName} ${l.code}`}
                    onSelect={() => handleSelect(l.code)}
                    className={cn(
                      "flex min-h-[48px] items-center justify-between rounded-xl px-3.5 py-3 text-base cursor-pointer font-medium transition-colors my-0.5",
                      isSelected
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "hover:bg-muted text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base sm:text-lg leading-tight font-semibold">
                        {l.label}
                      </span>
                      {l.englishName !== l.label && (
                        <span className="text-xs text-muted-foreground font-normal">
                          ({l.englishName})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="size-5 shrink-0 text-primary stroke-[2.5]" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default LanguageSelect;
