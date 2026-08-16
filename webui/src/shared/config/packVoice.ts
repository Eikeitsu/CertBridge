import { ThemePack } from "@/entities/module/enums";

/** 三套主题各自的产品文案 / 导航语气 */
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
  manageCertsHint: string;
  tempCerts: string;
  tempCertsHint: string;
  runtimeTitle: string;
  refresh: string;
  diagnose: string;
  certPermanent: string;
  certCustom: string;
  certSession: string;
  hotMountTitle: string;
  hotMountMeta: string;
  settingsUi: string;
  settingsModule: string;
  settingsAbout: string;
  topbarBrand: string;
  topbarKicker: string;
  logTitle: string;
  logEmpty: string;
  tabs: {
    home: string;
    certs: string;
    log: string;
    more: string;
  };
};

export const PACK_VOICE: Record<ThemePack, PackVoice> = {
  [ThemePack.Classic]: {
    stageKicker: "信任状态",
    trustTitle: "已启用",
    trustEmpty: "暂无证书，去「证书」页开启。",
    activePrefix: "当前：",
    idleDesc: "正在读取…",
    loadingHint: "加载中",
    applyingHint: "正在应用",
    metrics: {
      active: "启用",
      custom: "自定义",
      baseline: "基线",
      store: "总量",
    },
    actionsTitle: "功能",
    rebootTitle: "重启设备",
    rebootHint: "永久变更需重启后生效",
    manageCerts: "证书管理",
    manageCertsHint: "启用、导入",
    tempCerts: "临时证书",
    tempCertsHint: "免重启会话",
    runtimeTitle: "设备",
    refresh: "刷新",
    diagnose: "查看日志",
    certPermanent: "系统证书",
    certCustom: "自定义",
    certSession: "临时挂载",
    hotMountTitle: "临时会话",
    hotMountMeta: "免重启生效，卸载即恢复",
    settingsUi: "外观",
    settingsModule: "模块",
    settingsAbout: "关于",
    topbarBrand: "证书桥",
    topbarKicker: "印记",
    logTitle: "运行日志",
    logEmpty: "暂无记录",
    tabs: { home: "首页", certs: "证书", log: "日志", more: "我" },
  },
  [ThemePack.Material]: {
    stageKicker: "服务看板",
    trustTitle: "注入清单",
    trustEmpty: "尚未附加证书，前往证书中心配置。",
    activePrefix: "运行中：",
    idleDesc: "正在同步状态…",
    loadingHint: "同步中",
    applyingHint: "写入中",
    metrics: {
      active: "启用数",
      custom: "自定义",
      baseline: "系统基线",
      store: "存储总量",
    },
    actionsTitle: "快捷入口",
    rebootTitle: "重启以应用",
    rebootHint: "写入系统层后需重启",
    manageCerts: "证书中心",
    manageCertsHint: "管理永久注入",
    tempCerts: "运行时挂载",
    tempCertsHint: "即时会话",
    runtimeTitle: "运行环境",
    refresh: "立即刷新",
    diagnose: "打开诊断",
    certPermanent: "永久注入",
    certCustom: "自定义 CA",
    certSession: "运行时会话",
    hotMountTitle: "热挂载控制台",
    hotMountMeta: "命名空间级临时覆盖",
    settingsUi: "视觉主题",
    settingsModule: "挂载策略",
    settingsAbout: "产品信息",
    topbarBrand: "CertBridge",
    topbarKicker: "层积",
    logTitle: "诊断日志",
    logEmpty: "尚无诊断记录",
    tabs: { home: "概览", certs: "证书", log: "诊断", more: "设置" },
  },
  [ThemePack.Fluid]: {
    stageKicker: "此刻",
    trustTitle: "信任流",
    trustEmpty: "还没有证书漂过来，去「证书」加点 Reqable / ProxyPin。",
    activePrefix: "正生效 · ",
    idleDesc: "轻轻同步中…",
    loadingHint: "稍等一下",
    applyingHint: "正在切换",
    metrics: {
      active: "亮着",
      custom: "自带",
      baseline: "底座",
      store: "一共",
    },
    actionsTitle: "想做什么",
    rebootTitle: "重启一下",
    rebootHint: "永久改动要重启才稳",
    manageCerts: "管证书",
    manageCertsHint: "开关与导入",
    tempCerts: "临时挂一挂",
    tempCertsHint: "不用重启",
    runtimeTitle: "这台机器",
    refresh: "刷新一下",
    diagnose: "去看日志",
    certPermanent: "长期驻留",
    certCustom: "你导入的",
    certSession: "临时漂流",
    hotMountTitle: "免重启挂载",
    hotMountMeta: "挂上就能用，卸下就走",
    settingsUi: "外观情绪",
    settingsModule: "挂载气质",
    settingsAbout: "关于我们",
    topbarBrand: "证书桥",
    topbarKicker: "虹桥",
    logTitle: "流水账",
    logEmpty: "还没写过一行",
    tabs: { home: "此刻", certs: "证书", log: "流水", more: "更多" },
  },
};

export function getPackVoice(pack: ThemePack): PackVoice {
  return PACK_VOICE[pack] ?? PACK_VOICE[ThemePack.Classic];
}
