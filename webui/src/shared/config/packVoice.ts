import { ThemePack } from "@/entities/module/enums";

/** 轻量文案（新 UI 不再强依赖 pack 语气，保留兼容导出） */
export type PackVoice = {
  loadingHint: string;
  tabs: { home: string; certs: string; log: string; more: string };
};

const BASE: PackVoice = {
  loadingHint: "加载中…",
  tabs: { home: "首页", certs: "证书", log: "日志", more: "更多" },
};

export const PACK_VOICE: Record<ThemePack, PackVoice> = {
  [ThemePack.Settings]: BASE,
  [ThemePack.Console]: BASE,
  [ThemePack.Studio]: BASE,
};

export function getPackVoice(pack: ThemePack): PackVoice {
  return PACK_VOICE[pack] ?? PACK_VOICE[ThemePack.Settings];
}
