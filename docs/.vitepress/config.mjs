import { defineConfig } from "vitepress";

const repoName =
  process.env.VITEPRESS_BASE?.replace(/^\//, "").replace(/\/$/, "") || "CertBridge";

const zhNav = [
  { text: "首页", link: "/" },
  { text: "功能", link: "/guide/features" },
  { text: "安装", link: "/guide/install" },
  { text: "FAQ", link: "/guide/faq" },
  {
    text: "更多",
    items: [
      { text: "配置", link: "/guide/config" },
      { text: "隐藏", link: "/guide/hide" },
      { text: "WebUI", link: "/guide/webui" },
      { text: "CLI", link: "/guide/cli" },
      { text: "相关", link: "/guide/related" },
    ],
  },
  { text: "日志", link: "/guide/changelog" },
];

const zhSidebar = [
  {
    text: "指南",
    items: [
      { text: "功能", link: "/guide/features" },
      { text: "安装", link: "/guide/install" },
      { text: "配置", link: "/guide/config" },
      { text: "FAQ", link: "/guide/faq" },
    ],
  },
  {
    text: "隐藏与界面",
    items: [
      { text: "隐藏", link: "/guide/hide" },
      { text: "WebUI", link: "/guide/webui" },
      { text: "CLI", link: "/guide/cli" },
    ],
  },
  {
    text: "其它",
    items: [
      { text: "相关", link: "/guide/related" },
      { text: "日志", link: "/guide/changelog" },
      { text: "致谢", link: "/guide/credits" },
    ],
  },
];

const enNav = [
  { text: "Home", link: "/en/" },
  { text: "Features", link: "/en/guide/features" },
  { text: "Install", link: "/en/guide/install" },
  { text: "FAQ", link: "/en/guide/faq" },
  { text: "Changelog", link: "/en/guide/changelog" },
];

const enSidebar = [
  {
    text: "Guide",
    items: [
      { text: "Features", link: "/en/guide/features" },
      { text: "Install", link: "/en/guide/install" },
      { text: "Config", link: "/en/guide/config" },
      { text: "FAQ", link: "/en/guide/faq" },
      { text: "Hide", link: "/en/guide/hide" },
      { text: "WebUI", link: "/en/guide/webui" },
      { text: "CLI", link: "/en/guide/cli" },
      { text: "Changelog", link: "/en/guide/changelog" },
    ],
  },
];

export default defineConfig({
  title: "CertBridge",
  description: "System CA inject for Magisk / KernelSU / APatch",
  base: `/${repoName}/`,
  head: [
    ["link", { rel: "icon", type: "image/png", href: `/${repoName}/icon.png` }],
    ["link", { rel: "apple-touch-icon", href: `/${repoName}/icon.png` }],
  ],
  locales: {
    root: {
      label: "简体中文",
      lang: "zh-CN",
      title: "证书桥",
      description:
        "Magisk / KernelSU / APatch 系统 CA 注入：Reqable / ProxyPin / 自定义证书，挂载隐藏与 WebUI",
      themeConfig: {
        logo: "/icon.png",
        siteTitle: "证书桥",
        nav: zhNav,
        sidebar: zhSidebar,
        socialLinks: [{ icon: "github", link: "https://github.com/Eikeitsu/CertBridge" }],
        footer: {
          message: "证书桥 · CertBridge",
          copyright: "由许小墨维护",
        },
        search: { provider: "local" },
      },
    },
    en: {
      label: "English",
      lang: "en",
      link: "/en/",
      title: "CertBridge",
      description: "System CA inject for Magisk / KernelSU / APatch",
      themeConfig: {
        logo: "/icon.png",
        siteTitle: "CertBridge",
        nav: enNav,
        sidebar: enSidebar,
        socialLinks: [{ icon: "github", link: "https://github.com/Eikeitsu/CertBridge" }],
        footer: {
          message: "CertBridge",
          copyright: "Maintained by Xu Xiaomo",
        },
        search: { provider: "local" },
      },
    },
  },
});
