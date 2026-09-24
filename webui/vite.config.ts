import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(root, "..");

/**
 * Magisk / KernelSU WebUI 走自定义协议，通常不返回 CORS 头。
 * ES module 即使用相对路径也会走 CORS 校验 → 静默失败白屏，故输出 IIFE。
 * 同时去掉 crossorigin，并把 CSS 排到 JS 前面，首屏样式/loading 先可见。
 */
function magiskWebUiHtml(): Plugin {
  return {
    name: "magisk-webui-html",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        let out = html
          .replace(
            /<head>/i,
            '<head>\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />',
          )
          .replace(/\s+crossorigin(?:="[^"]*")?/gi, "")
          .replace(/\s+type="module"/gi, "");

        const links: string[] = [];
        const scripts: string[] = [];
        out = out.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
          links.push(tag);
          return "";
        });
        out = out.replace(
          /<script\b[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/gi,
          (tag) => {
            scripts.push(tag);
            return "";
          },
        );

        const orderedScripts = scripts.map((tag) => {
          if (/\sdefer\b/i.test(tag)) return tag;
          return tag.replace(/<script\b/i, "<script defer");
        });

        const injection = [...links, ...orderedScripts].join("\n    ");
        if (injection) {
          if (/<\/head>/i.test(out)) {
            out = out.replace(/<\/head>/i, `    ${injection}\n  </head>`);
          } else {
            out += injection;
          }
        }
        return out;
      },
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
      "@locales": resolve(repoRoot, "locales"),
    },
  },
  build: {
    outDir: resolve(repoRoot, ".build/webroot"),
    emptyOutDir: true,
    assetsDir: "assets",
    cssCodeSplit: false,
    modulePreload: false,
    minify: "esbuild",
    target: "es2019",
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
