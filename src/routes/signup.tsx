import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound, Phone } from "lucide-react";
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
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!prefs.language()) navigate({ to: "/" });
    else if (!prefs.consented()) navigate({ to: "/consent" });
    else if (prefs.loggedIn()) navigate({ to: "/home" });
  }, [navigate]);

  const submit = () => {
    if (mode === "signup") {
      if (!name.trim() || phone.trim().length < 6) return;
      authService.signUp(name, phone);
    } else if (!authService.logIn(phone)) {
      setErr(t("auth.notFound"));
      return;
    }
    prefs.setLoggedIn(true);
    navigate({ to: "/home" });
  };

  const field =
    "tap w-full rounded-2xl border-2 border-border bg-card px-4 text-lg outline-none focus:border-primary transition-colors";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="card-soft w-full max-w-lg border border-border/80 p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {t(mode === "signup" ? "auth.signupTitle" : "auth.loginTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? t("app.tagline") : t("auth.haveAccount")}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
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
                placeholder={t("auth.phone")}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^\d+ ]/g, ""));
                  setErr("");
                }}
              />
            </div>
          </label>

          {err && <p className="text-center text-sm font-semibold text-destructive">{err}</p>}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={submit}
            className="tap flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-primary py-4 text-xl font-bold text-primary-foreground shadow-md hover:bg-primary/95 active:scale-[0.98] transition-all"
          >
            {t(mode === "signup" ? "auth.signup" : "auth.login")}
          </button>
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setErr("");
            }}
            className="tap text-center text-base font-semibold text-primary underline py-2 hover:opacity-80 transition-opacity"
          >
            {t(mode === "signup" ? "auth.haveAccount" : "auth.newHere")}
          </button>
        </div>
      </div>
    </div>
  );
}
