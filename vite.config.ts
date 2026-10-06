// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load unprefixed secrets into the server process only. Never expose them as VITE_* client values.
  const serverEnv = loadEnv(mode, process.cwd(), "");
  for (const name of ["OPENAI_API_KEY", "BLENDER_WORKER_URL", "BLENDER_WORKER_TOKEN"]) {
    const value = serverEnv[name];
    if (value && !process.env[name]) process.env[name] = value;
  }
  return {
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    },
  };
});
