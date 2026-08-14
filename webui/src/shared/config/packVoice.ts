import { ThemePack } from "@/entities/module/enums";

/** 三套主题各自的产品文案语气 — 印记 / 层积 / 虹桥 */
export type PackVoice = {
  stageKicker: string;
  trustTitle: string;
  trustEmpty: string;
  activePrefix: string;
  idleDesc: string;
  metrics: {
    active: string;
    custom: string;
    baseline: string;
    store: string;
  };
  actionsTitle: string;
  rebootTitle: string;
  rebootHint: string;
  manageCerts: string;
  tempCerts: string;
  runtimeTitle: string;
  refresh: string;
  certPermanent: string;
  certSession: string;
  hotMountTitle: string;
  settingsUi: string;
  settingsModule: string;
  settingsAbout: string;
  topbarBrand: string;
};

export const PACK_VOICE: Record<ThemePack, PackVoice> = {
  [ThemePack.Classic]: {
    stageKicker: "信任状态",
    trustTitle: "生效凭证",
    trustEmpty: "账本为空。可在「证书」页启用或导入 CA。",
    activePrefix: "当前凭证：",
    idleDesc: "正在核对系统信任账本…",
    metrics: {
      active: "启用",
      custom: "自定义",
      baseline: "基线",
      store: "总量",
    },
    actionsTitle: "操作",
    rebootTitle: "重启设备",
    rebootHint: "永久挂载变更需重启后写入",
    manageCerts: "管理证书",
    tempCerts: "临时凭证",
    runtimeTitle: "运行细节",
    refresh: "刷新状态",
    certPermanent: "永久凭证",
    certSession: "临时会话",
    hotMountTitle: "免重启挂载",
    settingsUi: "外观",
    settingsModule: "模块",
    settingsAbout: "关于",
    topbarBrand: "证书桥",
  },
  [ThemePack.Material]: {
    stageKicker: "系统信任层",
    trustTitle: "已注入证书",
    trustEmpty: "本层尚无附加证书。前往证书页配置。",
    activePrefix: "注入集：",
    idleDesc: "正在读取信任层…",
    metrics: {
      active: "启用数",
      custom: "自定义",
      baseline: "系统基线",
      store: "存储总量",
    },
    actionsTitle: "快捷入口",
    rebootTitle: "重启以应用",
    rebootHint: "分层挂载在重启后完全对齐",
    manageCerts: "证书管理",
    tempCerts: "运行时层",
    runtimeTitle: "环境信息",
    refresh: "同步状态",
    certPermanent: "持久层",
    certSession: "运行时层",
    hotMountTitle: "运行时挂载",
    settingsUi: "显示与主题",
    settingsModule: "挂载与路径",
    settingsAbout: "模块信息",
    topbarBrand: "概览",
  },
  [ThemePack.Fluid]: {
    stageKicker: "桥接状态",
    trustTitle: "通道上的证书",
    trustEmpty: "通道空闲。去「证书」接通 Reqable / ProxyPin 或其他 CA。",
    activePrefix: "正在桥接：",
    idleDesc: "正在探测桥接通路…",
    metrics: {
      active: "接通",
      custom: "自建",
      baseline: "基线",
      store: "全量",
    },
    actionsTitle: "通道操作",
    rebootTitle: "重启设备",
    rebootHint: "让永久桥接在下次启动落地",
    manageCerts: "整理证书",
    tempCerts: "临时通道",
    runtimeTitle: "通路细节",
    refresh: "重新探测",
    certPermanent: "常驻桥接",
    certSession: "临时通道",
    hotMountTitle: "免重启通道",
    settingsUi: "界面气质",
    settingsModule: "桥接方式",
    settingsAbout: "关于证书桥",
    topbarBrand: "证书桥",
  },
};

export function getPackVoice(pack: ThemePack): PackVoice {
  return PACK_VOICE[pack] ?? PACK_VOICE[ThemePack.Classic];
}
