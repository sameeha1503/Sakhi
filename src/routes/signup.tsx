import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound, Phone, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { authService, prefs } from "@/services/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Sakhi" },
      { name: "description", content: "Create your Sakhi account." },
      { property: "og:title", content: "Sign up — Sakhi" },
      { property: "og:description", content: "Create your Sakhi account." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("sakhi:auth_mode");
      if (stored === "login") {
        sessionStorage.removeItem("sakhi:auth_mode");
        return "login";
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "login") return "login";
    }
    return "signup";
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("sakhi:auth_mode");
      if (stored === "login") {
        sessionStorage.removeItem("sakhi:auth_mode");
        setMode("login");
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "login") setMode("login");
    }
  }, []);

  useEffect(() => {
    if (!prefs.language()) navigate({ to: "/" });
    else if (!prefs.consented()) navigate({ to: "/consent" });
    else if (prefs.loggedIn()) navigate({ to: "/home" });
  }, [navigate]);

  const submit = async () => {
    if (loading) return;
    setErr("");
    setAlreadyRegistered(false);

    if (mode === "signup") {
      if (!name.trim()) {
        setErr(t("auth.nameRequired"));
        return;
      }
      if (!phone.trim()) {
        setErr(t("auth.invalidPhone"));
        return;
      }
      if (pin.length !== 6) {
        setErr(t("auth.pinLength"));
        return;
      }

      setLoading(true);
      const res = await authService.signUp(name, phone, pin);
      setLoading(false);

      if (!res.success) {
        if (res.alreadyRegistered) {
          setAlreadyRegistered(true);
        }
        setErr(t(res.errorKey || "auth.errorGeneric"));
        return;
      }
    } else {
      if (!phone.trim() || pin.length !== 6) {
        setErr(t("auth.invalidCredentials"));
        return;
      }

      setLoading(true);
      const res = await authService.logIn(phone, pin);
      setLoading(false);

      if (!res.success) {
        setErr(t(res.errorKey || "auth.invalidCredentials"));
        return;
      }
    }

    prefs.setLoggedIn(true);
    navigate({ to: "/home" });
  };

  const handleContinueAsGuest = () => {
    authService.continueWithoutAccount(name);
    prefs.setLoggedIn(true);
    navigate({ to: "/home" });
  };

  const field =
    "tap w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-lg outline-none focus:border-primary transition-colors";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="card-soft w-full max-w-lg border border-border/80 p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {t(mode === "signup" ? "auth.signupTitle" : "auth.loginTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? t("app.tagline") : t("auth.haveAccount")}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-muted-foreground">{t("auth.name")}</span>
              <div className="relative flex items-center">
                <UserRound className="absolute left-4 size-5 text-muted-foreground" />
                <input
                  className={`${field} pl-12`}
                  placeholder={t("auth.name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-muted-foreground">{t("auth.phone")}</span>
            <div className="relative flex items-center">
              <Phone className="absolute left-4 size-5 text-muted-foreground" />
              <input
                className={`${field} pl-12`}
                inputMode="tel"
                placeholder={t("auth.phonePlaceholder")}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^\d+ -]/g, ""));
                  setErr("");
                  setAlreadyRegistered(false);
                }}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-muted-foreground">{t("auth.pin")}</span>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 size-5 text-muted-foreground" />
              <input
                className={`${field} pl-12 pr-12`}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t("auth.pinPlaceholder")}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/[^\d]/g, "").slice(0, 6));
                  setErr("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="tap absolute right-3 rounded-lg p-2 text-muted-foreground hover:text-foreground"
                aria-label={showPin ? t("auth.hidePin") : t("auth.showPin")}
              >
                {showPin ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">{t("auth.pinHelp")}</p>
            )}
          </label>

          {err && (
            <div className="rounded-xl bg-destructive/10 p-3 text-center text-sm font-semibold text-destructive">
              <p>{err}</p>
              {alreadyRegistered && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErr("");
                    setAlreadyRegistered(false);
                  }}
                  className="tap mt-2 inline-block font-bold text-primary underline"
                >
                  {t("auth.logInInstead")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={submit}
            disabled={loading}
            className="tap flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xl font-bold text-primary-foreground shadow-md hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {loading && <Loader2 className="size-5 animate-spin" />}
            <span>{t(mode === "signup" ? "auth.signup" : "auth.login")}</span>
          </button>

          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setErr("");
              setAlreadyRegistered(false);
            }}
            className="tap text-center text-base font-semibold text-primary underline py-2 hover:opacity-80 transition-opacity"
          >
            {t(mode === "signup" ? "auth.haveAccount" : "auth.newHere")}
          </button>

          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
              {t("auth.orDivider")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="tap flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-border/80 bg-background/50 px-4 py-3 text-sm font-semibold text-foreground/80 hover:border-primary/40 hover:text-foreground active:scale-[0.98] transition-all text-center"
          >
            {t("auth.continueWithoutAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
