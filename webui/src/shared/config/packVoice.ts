import { ThemePack } from "@/entities/module/enums";

/** 三套主题各自的产品文案语气 — 印记 / 层积 / 虹桥 */
export type PackVoice = {
  stageKicker: string;
  trustTitle: string;
  trustEmpty: string;
  activePrefix: string;
  idleDesc: string;
  loadingHint: string;
  applyingHint: string;
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
  topbarKicker: string;
};

export const PACK_VOICE: Record<ThemePack, PackVoice> = {
  [ThemePack.Classic]: {
    stageKicker: "当前状态",
    trustTitle: "已启用证书",
    trustEmpty: "暂无证书。可在「证书」页启用或导入。",
    activePrefix: "当前：",
    idleDesc: "正在加载…",
    loadingHint: "加载中",
    applyingHint: "正在应用",
    metrics: {
      active: "启用",
      custom: "自定义",
      baseline: "基线",
      store: "总量",
    },
    actionsTitle: "操作",
    rebootTitle: "重启设备",
    rebootHint: "永久变更需重启后生效",
    manageCerts: "管理证书",
    tempCerts: "临时证书",
    runtimeTitle: "设备信息",
    refresh: "刷新",
    certPermanent: "永久证书",
    certSession: "临时证书",
    hotMountTitle: "免重启挂载",
    settingsUi: "外观",
    settingsModule: "模块",
    settingsAbout: "关于",
    topbarBrand: "证书桥",
    topbarKicker: "印记",
  },
  [ThemePack.Material]: {
    stageKicker: "服务状态",
    trustTitle: "已注入证书",
    trustEmpty: "暂无附加证书，前往证书页配置。",
    activePrefix: "当前：",
    idleDesc: "正在同步…",
    loadingHint: "同步中",
    applyingHint: "正在应用",
    metrics: {
      active: "启用数",
      custom: "自定义",
      baseline: "系统基线",
      store: "存储总量",
    },
    actionsTitle: "常用功能",
    rebootTitle: "重启以应用",
    rebootHint: "永久变更需重启后生效",
    manageCerts: "证书管理",
    tempCerts: "临时证书",
    runtimeTitle: "环境信息",
    refresh: "刷新",
    certPermanent: "永久证书",
    certSession: "临时证书",
    hotMountTitle: "运行时挂载",
    settingsUi: "外观",
    settingsModule: "模块设置",
    settingsAbout: "关于",
    topbarBrand: "证书桥",
    topbarKicker: "层积",
  },
  [ThemePack.Fluid]: {
    stageKicker: "当前状态",
    trustTitle: "已启用证书",
    trustEmpty: "还没有证书。去「证书」页添加 Reqable / ProxyPin 或其他 CA。",
    activePrefix: "当前：",
    idleDesc: "正在更新…",
    loadingHint: "加载中",
    applyingHint: "正在切换",
    metrics: {
      active: "启用",
      custom: "自定义",
      baseline: "基线",
      store: "总量",
    },
    actionsTitle: "快捷操作",
    rebootTitle: "重启设备",
    rebootHint: "永久变更需重启后生效",
    manageCerts: "管理证书",
    tempCerts: "临时证书",
    runtimeTitle: "运行信息",
    refresh: "刷新",
    certPermanent: "永久证书",
    certSession: "临时证书",
    hotMountTitle: "免重启挂载",
    settingsUi: "外观",
    settingsModule: "挂载设置",
    settingsAbout: "关于",
    topbarBrand: "证书桥",
    topbarKicker: "虹桥",
  },
};

export function getPackVoice(pack: ThemePack): PackVoice {
  return PACK_VOICE[pack] ?? PACK_VOICE[ThemePack.Classic];
}
