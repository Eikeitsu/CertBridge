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

export type AboutLinkId = "docs" | "repo" | "coolapk" | BuiltinCertKind.Reqable | BuiltinCertKind.Proxypin;

export const ABOUT_LINKS = [
  { id: "docs" as const, url: LINKS.docs },
  { id: "repo" as const, url: LINKS.repo },
  { id: "coolapk" as const, url: LINKS.coolapk },
  { id: BuiltinCertKind.Reqable, url: LINKS.reqable },
  { id: BuiltinCertKind.Proxypin, url: LINKS.proxypin },
] as const;

export const ABOUT_TIP_CHANNELS = [
  {
    id: "wechat" as const,
    labelEn: "wechat",
    src: ASSETS.tipWechat,
  },
  {
    id: "alipay" as const,
    labelEn: "alipay",
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
