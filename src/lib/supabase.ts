import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Normalises a Supabase project URL by:
 * - Trimming whitespace
 * - Stripping any trailing /rest/v1 suffix
 * - Stripping any trailing slash
 */
export function normalizeSupabaseUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

let customSupabaseClient: SupabaseClient | null | undefined = undefined;
let cachedClient: SupabaseClient | null | undefined = undefined;

export function setCustomSupabaseClient(client: SupabaseClient | null | undefined) {
  customSupabaseClient = client;
  cachedClient = undefined;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (customSupabaseClient !== undefined) {
    return customSupabaseClient;
  }

  // Never create or access the browser client during SSR
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const rawUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)
      : undefined;
  const anonKey =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined)
      : undefined;

  const url = normalizeSupabaseUrl(rawUrl);
  if (!url || !anonKey || !anonKey.trim()) {
    cachedClient = null;
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return cachedClient;
  } catch (err) {
    console.warn("[supabase] Failed to initialise Supabase client:", err);
    cachedClient = null;
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}
