import { BuiltinCertKind, ResolvedTheme } from "@/entities/module/enums";
import { ASSETS, assetUrl } from "./assets";

export const BRAND = {
  name: "证书桥",
  nameEn: "CertBridge",
  author: "许小墨",
} as const;

export const LINKS = {
  docs: "https://eikeitsu.github.io/CertBridge/",
  repo: "https://github.com/eikeitsu/CertBridge",
  coolapk: "https://www.coolapk.com/u/7602666",
  reqable: "https://reqable.com",
  proxypin: "https://github.com/wanghongenpin/proxypin",
} as const;

export const ABOUT_LINKS = [
  { id: "docs", url: LINKS.docs, label: "使用指南" },
  { id: "repo", url: LINKS.repo, label: "开源仓库" },
  { id: "coolapk", url: LINKS.coolapk, label: "酷安主页" },
  { id: BuiltinCertKind.Reqable, url: LINKS.reqable, label: "Reqable 官网" },
  { id: BuiltinCertKind.ProxyPin, url: LINKS.proxypin, label: "ProxyPin 仓库" },
] as const;

export const ABOUT_TIP = {
  title: "打赏作者",
  body: `${BRAND.author} · 微信 / 支付宝。如果证书桥帮到了你，欢迎请作者喝杯奶茶。`,
  alt: "打赏码",
  src: ASSETS.tipQr,
} as const;

export function brandMarkSrc(theme: ResolvedTheme): string {
  return assetUrl(theme === ResolvedTheme.Dark ? ASSETS.markLight : ASSETS.mark);
}
