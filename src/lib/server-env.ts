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
      const fs =
        (globalThis as unknown as { require?: (mod: string) => unknown }).require?.("node:fs") ||
        (typeof window === "undefined" ? eval('require("node:fs")') : null);
      const path =
        (globalThis as unknown as { require?: (mod: string) => unknown }).require?.("node:path") ||
        (typeof window === "undefined" ? eval('require("node:path")') : null);

      if (fs && path) {
        const rootDir = process.cwd();
        const envFiles = [".env.local", ".env"];

        for (const file of envFiles) {
          const filePath = path.resolve(rootDir, file);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            parseAndApplyEnv(content);
          }
        }
      }
    }
  } catch {
    // Graceful fallback for non-Node environments (Cloudflare Workers, edge runtimes)
  }

  logGeoapifyStartup();
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
 * Reset helper strictly for unit testing.
 */
export function resetLoggedStatusForTests(): void {
  hasLoggedGeoapify = false;
  delete (globalThis as { __sakhi_geoapify_logged?: boolean }).__sakhi_geoapify_logged;
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
