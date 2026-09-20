import { defineConfig } from "vitepress";

const repoName =
  process.env.VITEPRESS_BASE?.replace(/^\//, "").replace(/\/$/, "") || "CertBridge";

export default defineConfig({
  title: "证书桥",
  description:
    "Magisk / KernelSU / APatch 系统 CA 注入：Reqable / ProxyPin / 自定义证书，挂载隐藏与 WebUI",
  base: `/${repoName}/`,
  lang: "zh-CN",
  head: [
    ["link", { rel: "icon", type: "image/png", href: `/${repoName}/icon.png` }],
    [
      "link",
      {
        rel: "apple-touch-icon",
        href: `/${repoName}/icon.png`,
      },
    ],
  ],
  themeConfig: {
    logo: "/icon.png",
    siteTitle: "证书桥",
    nav: [
      { text: "首页", link: "/" },
      { text: "功能介绍", link: "/guide/features" },
      { text: "安装", link: "/guide/install" },
      { text: "常见问题", link: "/guide/faq" },
      {
        text: "更多",
        items: [
          { text: "配置说明", link: "/guide/config" },
          { text: "挂载隐藏", link: "/guide/hide" },
          { text: "WebUI", link: "/guide/webui" },
          { text: "命令行 CLI", link: "/guide/cli" },
          { text: "相关软件", link: "/guide/related" },
        ],
      },
      { text: "更新日志", link: "/guide/changelog" },
    ],
    sidebar: [
      {
        text: "使用指南",
        items: [
          { text: "功能介绍", link: "/guide/features" },
          { text: "安装与升级", link: "/guide/install" },
          { text: "配置说明", link: "/guide/config" },
          { text: "常见问题", link: "/guide/faq" },
        ],
      },
      {
        text: "隐藏与界面",
        items: [
          { text: "挂载隐藏", link: "/guide/hide" },
          { text: "WebUI", link: "/guide/webui" },
          { text: "命令行 CLI", link: "/guide/cli" },
        ],
      },
      {
        text: "其它",
        items: [
          { text: "相关软件", link: "/guide/related" },
          { text: "更新日志", link: "/guide/changelog" },
          { text: "致谢", link: "/guide/credits" },
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
      message: "证书桥 · CertBridge · Magisk / KernelSU / APatch",
      copyright: "由许小墨维护",
    },
    search: {
      provider: "local",
    },
  },
});
