import { defineConfig } from "vitepress";

const repoName =
  process.env.VITEPRESS_BASE?.replace(/^\//, "").replace(/\/$/, "") ||
  "CertBridge";

export default defineConfig({
  title: "证书桥",
  description: "将 Reqable / ProxyPin / 自定义 CA 合并进 Android 系统信任库；完整版与 Lite 双包",
  base: `/${repoName}/`,
  lang: "zh-CN",
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "功能介绍", link: "/guide/features" },
      { text: "安装", link: "/guide/install" },
      { text: "配置说明", link: "/guide/config" },
      { text: "更新日志", link: "/guide/changelog" },
    ],
    sidebar: [
      {
        text: "使用指南",
        items: [
          { text: "功能介绍", link: "/guide/features" },
          { text: "安装与升级", link: "/guide/install" },
          { text: "配置说明", link: "/guide/config" },
          { text: "更新日志", link: "/guide/changelog" },
          { text: "常见问题", link: "/guide/faq" },
          { text: "相关软件", link: "/guide/related" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Eikeitsu/CertBridge",
      },
    ],
    footer: {
      message: "CertBridge · 证书桥",
      copyright: "许小墨",
    },
  },
});
