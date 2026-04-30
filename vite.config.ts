import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const pollinationsKey =
    env.POLLINATIONS_SECRET_KEY ||
    env.VITE_POLLINATIONS_API_KEY ||
    process.env.POLLINATIONS_SECRET_KEY ||
    process.env.VITE_POLLINATIONS_API_KEY;

  const nvidiaKey =
    env.NVIDIA_API_KEY ||
    env.VITE_NVIDIA_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.VITE_NVIDIA_API_KEY;

  if (!pollinationsKey) {
    console.warn(
      "Warning: POLLINATIONS_SECRET_KEY/VITE_POLLINATIONS_API_KEY is not defined. Pollinations proxy requests will be sent without a key and may return 401.",
    );
  }

  if (!nvidiaKey) {
    console.warn(
      "Warning: NVIDIA_API_KEY/VITE_NVIDIA_API_KEY is not defined. NVIDIA requests may fail in development.",
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      proxy: {
        "/api/nvidia": {
          target: "https://integrate.api.nvidia.com",
          changeOrigin: true,
          headers: nvidiaKey
            ? {
                Authorization: `Bearer ${nvidiaKey}`,
              }
            : undefined,
          rewrite: (path) => path.replace(/^\/api\/nvidia/, ""),
        },
        "/api/pollinations": {
          target: "https://gen.pollinations.ai",
          changeOrigin: true,
          rewrite: (path) => {
            const rewritten = path.replace(/^\/api\/pollinations/, "");
            return pollinationsKey
              ? `${rewritten}${rewritten.includes("?") ? "&" : "?"}key=${pollinationsKey}`
              : rewritten;
          },
        },
      },
    },
  };
});
