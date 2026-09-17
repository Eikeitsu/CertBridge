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
  { id: BuiltinCertKind.Proxypin, url: LINKS.proxypin, label: "ProxyPin 仓库" },
] as const;

export const ABOUT_TIP = {
  title: "打赏作者",
  body: `${BRAND.author} · 微信 / 支付宝。如果证书桥帮到了你，欢迎请作者喝杯奶茶。`,
} as const;

export const ABOUT_TIP_CHANNELS = [
  {
    id: "wechat",
    label: "微信支付",
    labelEn: "wechat",
    alt: "微信收款码",
    src: ASSETS.tipWechat,
  },
  {
    id: "alipay",
    label: "支付宝",
    labelEn: "alipay",
    alt: "支付宝收款码",
    src: ASSETS.tipAlipay,
  },
] as const;

export function brandMarkSrc(theme: ResolvedTheme): string {
  return assetUrl(theme === ResolvedTheme.Dark ? ASSETS.markLight : ASSETS.mark);
}

/** Magisk / KernelSU 模块图标（带底色的小图标） */
export function brandModuleIconSrc(): string {
  return assetUrl(ASSETS.icon);
}
