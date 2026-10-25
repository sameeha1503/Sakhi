// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Ensure .env.local and .env are loaded into process.env for server runtime (/api/* routes, SSR)
const mode = process.env["NODE_ENV"] || "development";
const loadedEnv = loadEnv(mode, process.cwd(), "");
for (const [key, value] of Object.entries(loadedEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Startup presence log: log ONLY whether key is "set" or "missing", NEVER the secret value
const isGeoapifySet = Boolean(process.env["GEOAPIFY_API_KEY"]?.trim());
const g = globalThis as { __sakhi_geoapify_logged?: boolean };
if (!g.__sakhi_geoapify_logged) {
  g.__sakhi_geoapify_logged = true;
  console.log(`GEOAPIFY_API_KEY: ${isGeoapifySet ? "set" : "missing"}`);
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
