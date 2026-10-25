import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type UserConfig, type PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const isDev = mode === "development";
  const isBuild = command === "build";

  // VITE_* env define injection
  const envDefine: Record<string, string> = {};
  const viteEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(viteEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  // Plugins in order:
  // 1. TanStack devtools (dev only)
  // 2. @tailwindcss/vite
  // 3. vite-tsconfig-paths
  // 4. @tanstack/react-start (with server: { entry: "server" })
  // 5. nitro (build only, cloudflare-module preset)
  // 6. @vitejs/plugin-react
  const plugins: PluginOption[] = [];

  if (isDev) {
    const { devtools } = await import("@tanstack/devtools-vite");
    plugins.push(
      devtools({
        logging: false,
        eventBusConfig: { enabled: false },
        enhancedLogs: { enabled: false },
        consolePiping: { enabled: false },
        removeDevtoolsOnBuild: false,
        injectSource: { enabled: true },
      }),
    );
  }

  plugins.push(tailwindcss());
  plugins.push(tsConfigPaths({ projects: ["./tsconfig.json"] }));
  plugins.push(
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
  );

  if (isBuild) {
    const { nitro } = await import("nitro/vite");
    plugins.push(
      nitro({
        defaultPreset: "cloudflare-module",
      }),
    );
  }

  plugins.push(viteReact());

  return {
    define: envDefine,
    server: {
      host: "::",
      port: 8080,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    css: {
      transformer: "lightningcss",
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins,
  };
});
