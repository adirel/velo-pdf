import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: { target: "es2022" },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,png,wasm,bcmap,pfb,ttf,icc,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        id: "/",
        name: "Velo PDF",
        short_name: "Velo PDF",
        description: "Instant viewing for massive PDFs. Local, offline, zero lag.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#070914",
        theme_color: "#070914",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "logo.svg", sizes: "any", type: "image/svg+xml" },
        ],
        // Registers the installed app with the OS (Windows "Open with") as a PDF handler.
        // `icons` and `launch_type` are valid manifest members the plugin's types don't know yet.
        file_handlers: [
          {
            action: "/",
            accept: { "application/pdf": [".pdf"] },
            icons: [{ src: "icons/file-256.png", sizes: "256x256", type: "image/png" }],
            launch_type: "multiple-clients",
          } as { action: string; accept: Record<string, string[]> },
        ],
        launch_handler: { client_mode: "navigate-new" },
      },
    }),
  ],
});
