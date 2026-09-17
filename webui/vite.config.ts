import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(root, "..");

/**
 * Magisk / KernelSU WebUI 走自定义协议，通常不返回 CORS 头。
 * Vite 默认给 script/link 加 crossorigin + type="module"，会在 WebView 里被静默拦截 → 白屏。
 * 输出 IIFE 经典脚本，并去掉 crossorigin。
 */
function magiskWebUiHtml(): Plugin {
  return {
    name: "magisk-webui-html",
    transformIndexHtml(html) {
      let out = html
        .replace(
          /<head>/i,
          '<head>\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />',
        )
        .replace(/\s+crossorigin(?:="[^"]*")?/gi, "")
        .replace(/\s+type="module"/gi, "");
      // 去掉 type=module 后不再自动 defer；head 里同步执行时 #root 尚不存在会白屏
      out = out.replace(
        /<script(\s[^>]*src="[^"]+"[^>]*)><\/script>/gi,
        (_match, attrs: string) => {
          if (/\sdefer\b/i.test(attrs)) return `<script${attrs}></script>`;
          return `<script defer${attrs}></script>`;
        },
      );
      return out;
    },
  };
}

export default defineConfig(({ command }) => ({
  root,
  base: "./",
  // Magisk WebView 需要去 module/crossorigin；本地 Vite 开发必须保留 type=module
  plugins: [react(), ...(command === "build" ? [magiskWebUiHtml()] : [])],
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
    modulePreload: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
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
}));
