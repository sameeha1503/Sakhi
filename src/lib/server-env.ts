// Server environment configuration & runtime loader
// Safely loads server-only environment variables (.env.local, .env) in development and production
// Variables without VITE_ prefix are kept server-side only and NEVER exposed to the browser.

let hasLoggedGeoapify = false;
let envLoaded = false;

/**
 * Loads environment variables from .env.local and .env into process.env if in a Node environment.
 * Does not overwrite existing non-empty environment variables already provided by the host.
 */
export function loadServerEnv(): void {
  if (envLoaded) return;
  envLoaded = true;

  try {
    // Only attempt filesystem loading if Node.js process and fs are available
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
      // Use indirect eval to prevent static bundler warnings while safely loading .env if available
      const req =
        (globalThis as unknown as { require?: (mod: string) => unknown }).require ||
        (typeof window === "undefined"
          ? ((0, eval)('typeof require !== "undefined" ? require : null') as
              ((mod: string) => Record<string, unknown>) | null)
          : null);
      const fs = req
        ? (req("node:fs") as {
            existsSync?: (p: string) => boolean;
            readFileSync?: (p: string, enc: string) => string;
          } | null)
        : null;
      const path = req
        ? (req("node:path") as { resolve?: (...p: string[]) => string } | null)
        : null;

      if (fs && path && typeof fs.existsSync === "function" && typeof path.resolve === "function") {
        const rootDir = process.cwd();
        const envFiles = [".env.local", ".env"];

        for (const file of envFiles) {
          const filePath = path.resolve(rootDir, file);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync ? fs.readFileSync(filePath, "utf-8") : "";
            if (content) {
              parseAndApplyEnv(content);
            }
          }
        }
      }
    }
  } catch {
    // Graceful fallback for environments without filesystem access (Vercel edge, Workers) or when no .env files exist
  }

  logServerEnvStartup();
}

/**
 * Parses raw .env content and assigns variables to process.env if not already set.
 */
export function parseAndApplyEnv(rawContent: string): void {
  if (typeof process === "undefined" || !process.env) return;

  const lines = rawContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();

    // Strip wrapping quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    // Only assign if currently unset or empty in process.env
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

let hasLoggedLlm = false;

/**
 * Logs whether GEOAPIFY_API_KEY is present or missing on startup.
 * Logs only the presence ("set" or "missing"), NEVER the secret key value.
 * Guaranteed to log at most once per process.
 */
export function logGeoapifyStartup(): void {
  const g = globalThis as { __sakhi_geoapify_logged?: boolean };
  if (hasLoggedGeoapify || g.__sakhi_geoapify_logged) {
    return;
  }
  hasLoggedGeoapify = true;
  g.__sakhi_geoapify_logged = true;

  const isSet = Boolean(process.env["GEOAPIFY_API_KEY"]?.trim());
  console.log(`GEOAPIFY_API_KEY: ${isSet ? "set" : "missing"}`);
}

/**
 * Logs whether LLM variables are present or missing on startup.
 * Logs only the presence ("set" or "missing"), NEVER the secret key values.
 * Guaranteed to log at most once per process.
 */
export function logLlmStartup(): void {
  const g = globalThis as { __sakhi_llm_logged?: boolean };
  if (hasLoggedLlm || g.__sakhi_llm_logged) {
    return;
  }
  hasLoggedLlm = true;
  g.__sakhi_llm_logged = true;

  const isLlmUrlSet = Boolean(process.env["LLM_API_URL"]?.trim());
  const isLlmKeySet = Boolean(process.env["LLM_API_KEY"]?.trim());
  const isLlmModelSet = Boolean(process.env["LLM_MODEL"]?.trim());

  console.log(`LLM_API_URL: ${isLlmUrlSet ? "set" : "missing"}`);
  console.log(`LLM_API_KEY: ${isLlmKeySet ? "set" : "missing"}`);
  console.log(`LLM_MODEL: ${isLlmModelSet ? "set" : "missing"}`);

  if (process.env["LLM_FALLBACK_URL"]?.trim() || process.env["LLM_FALLBACK_KEY"]?.trim()) {
    console.log(`LLM_FALLBACK_URL: ${process.env["LLM_FALLBACK_URL"]?.trim() ? "set" : "missing"}`);
    console.log(`LLM_FALLBACK_KEY: ${process.env["LLM_FALLBACK_KEY"]?.trim() ? "set" : "missing"}`);
    console.log(
      `LLM_FALLBACK_MODEL: ${process.env["LLM_FALLBACK_MODEL"]?.trim() ? "set" : "missing"}`,
    );
  }
}

/**
 * Logs both Geoapify and LLM startup environment statuses.
 */
export function logServerEnvStartup(): void {
  logGeoapifyStartup();
  logLlmStartup();
}

/**
 * Reset helper strictly for unit testing.
 */
export function resetLoggedStatusForTests(): void {
  hasLoggedGeoapify = false;
  hasLoggedLlm = false;
  delete (globalThis as { __sakhi_geoapify_logged?: boolean }).__sakhi_geoapify_logged;
  delete (globalThis as { __sakhi_llm_logged?: boolean }).__sakhi_llm_logged;
  delete (globalThis as { __sakhi_env_logged?: boolean }).__sakhi_env_logged;
}

/**
 * Returns the configured Geoapify API key, or null if missing/empty.
 * Server-side only: never return or pass this value to the browser.
 */
export function getGeoapifyApiKey(): string | null {
  loadServerEnv();
  const key = process.env["GEOAPIFY_API_KEY"]?.trim();
  return key || null;
}

/**
 * Checks if the Geoapify API key is set without revealing the value.
 */
export function isGeoapifyConfigured(): boolean {
  loadServerEnv();
  return Boolean(process.env["GEOAPIFY_API_KEY"]?.trim());
}

/**
 * Returns LLM server configurations securely.
 * Server-side only: never expose secrets to browser client.
 */
export function getLlmConfig() {
  loadServerEnv();
  return {
    apiUrl: process.env["LLM_API_URL"]?.trim() || null,
    apiKey: process.env["LLM_API_KEY"]?.trim() || null,
    model: process.env["LLM_MODEL"]?.trim() || "gpt-4o-mini",
    dailyLimit: Number(process.env["LLM_DAILY_LIMIT"]) || 400,
    fallbackUrl: process.env["LLM_FALLBACK_URL"]?.trim() || null,
    fallbackKey: process.env["LLM_FALLBACK_KEY"]?.trim() || null,
    fallbackModel: process.env["LLM_FALLBACK_MODEL"]?.trim() || "gpt-4o-mini",
  };
}
