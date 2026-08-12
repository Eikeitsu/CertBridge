import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(root, "..");

export default defineConfig({
  root,
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(root, "src"),
    },
  },
  build: {
    outDir: resolve(repoRoot, ".build/webroot"),
    emptyOutDir: true,
    assetsDir: "assets",
    cssCodeSplit: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        entryFileNames: "js/app.js",
        chunkFileNames: "js/[name].js",
        assetFileNames: (info) => {
          if (info.name?.endsWith(".css")) return "css/style.css";
          return "assets/[name][extname]";
        },
      },
    },
  },
  server: {
    port: 5174,
    host: true,
  },
});
