import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  User as UserIcon,
  Settings,
  LogOut,
  CheckCircle2,
  RefreshCw,
  CloudOff,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { maskPhoneNumber, type User } from "@/services/auth";
import type { SyncStatus } from "@/services/storage";

export interface AccountMenuProps {
  user: User;
  syncStatus: SyncStatus;
  onRequestLogout: () => void;
}

function MenuInner({
  user,
  syncStatus,
  onClose,
  onRequestLogout,
}: {
  user: User;
  syncStatus: SyncStatus;
  onClose: () => void;
  onRequestLogout: () => void;
}) {
  const { t } = useTranslation();
  const initial = user.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "";

  return (
    <div className="flex flex-col gap-2 p-1">
      {/* User Header */}
      <div className="flex items-center gap-3 px-2 py-1.5">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-module-teal/15 text-module-teal font-bold text-base border border-module-teal/30">
          {initial || <UserIcon className="size-5 text-module-teal" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground text-sm leading-tight truncate">
            {user.name || "Friend"}
          </p>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {maskPhoneNumber(user.phone || "")}
          </p>
          {/* Sync status line */}
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-muted-foreground">
            {syncStatus === "synced" && (
              <>
                <CheckCircle2 className="size-3 text-success shrink-0" />
                <span className="text-success font-semibold">{t("sync.synced")}</span>
              </>
            )}
            {syncStatus === "saving" && (
              <>
                <RefreshCw className="size-3 text-primary animate-spin shrink-0" />
                <span className="text-primary font-semibold">{t("sync.saving")}</span>
              </>
            )}
            {syncStatus === "offline" && (
              <>
                <CloudOff className="size-3 text-warning shrink-0" />
                <span className="text-warning-foreground font-semibold">{t("sync.offline")}</span>
              </>
            )}
            {syncStatus === "not_signed_in" && (
              <>
                <CloudOff className="size-3 text-muted-foreground shrink-0" />
                <span>{t("sync.notSignedIn")}</span>
              </>
            )}
            {syncStatus === "not_configured" && (
              <>
                <CloudOff className="size-3 text-muted-foreground shrink-0" />
                <span>{t("settings.syncNotConfigured")}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-border/70 my-1" />

      {/* Navigation links */}
      <div className="flex flex-col gap-1">
        <Link
          to="/profile"
          onClick={onClose}
          className="tap flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/70 text-sm font-semibold text-foreground min-h-[44px] transition-colors"
        >
          <UserIcon className="size-4 text-muted-foreground" />
          <span>{t("auth.myProfile", "My profile")}</span>
        </Link>

        <Link
          to="/settings"
          onClick={onClose}
          className="tap flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/70 text-sm font-semibold text-foreground min-h-[44px] transition-colors"
        >
          <Settings className="size-4 text-muted-foreground" />
          <span>{t("settings.title", "Settings")}</span>
        </Link>
      </div>

      <div className="h-px bg-border/70 my-1" />

      {/* Log out item */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onRequestLogout();
        }}
        className="tap w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold min-h-[44px] text-primary hover:bg-primary/10 transition-colors"
      >
        <LogOut className="size-4 text-primary" />
        <span>{t("auth.logOut", "Log out")}</span>
      </button>
    </div>
  );
}

export function AccountMenu({ user, syncStatus, onRequestLogout }: AccountMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const initial = user.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "";

  const triggerButton = (
    <button
      type="button"
      aria-label={t("auth.accountMenu", "Account menu")}
      className="tap rounded-full size-10 min-h-[44px] min-w-[44px] flex items-center justify-center bg-module-teal/15 text-module-teal font-bold border border-module-teal/30 hover:bg-module-teal/25 transition-all text-sm shrink-0 shadow-2xs"
    >
      {initial || <UserIcon className="size-5 text-module-teal" />}
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl p-5 border-t-2 border-border/80">
          <MenuInner
            user={user}
            syncStatus={syncStatus}
            onClose={() => setOpen(false)}
            onRequestLogout={onRequestLogout}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-3xl p-3 border-2 border-border/80 shadow-lg bg-card text-card-foreground"
      >
        <MenuInner
          user={user}
          syncStatus={syncStatus}
          onClose={() => setOpen(false)}
          onRequestLogout={onRequestLogout}
        />
      </PopoverContent>
    </Popover>
  );
}
