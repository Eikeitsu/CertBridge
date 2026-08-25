import { ThemePack, TabName } from "@/entities/module/enums";

/** 三套主题各自独立的文案与导航语气 */
export type PackVoice = {
  brand: string;
  loadingHint: string;
  tabs: Record<TabName, string>;
  overview: {
    kicker: string;
    emptyActive: string;
    metrics: { active: string; custom: string; baseline: string; store: string };
    pipelineTitle: string;
    runtimeTitle: string;
    refresh: string;
    reboot: string;
  };
  certs: {
    builtinTitle: string;
    builtinMeta: string;
    customTitle: string;
    customEmpty: string;
    importLabel: string;
    refresh: string;
    hotTitle: string;
  };
  log: {
    title: string;
    metaEmpty: string;
    refresh: string;
    clear: string;
    emptyFiltered: string;
    emptyAll: string;
  };
  hide: {
    switchTitle: string;
    switchMeta: string;
    allowTitle: string;
    allowOn: string;
    allowOff: string;
    captureTitle: string;
    captureMeta: string;
    introTitle: string;
    introBody: string;
    guideTitle: string;
    guideMeta: string;
    docsCta: string;
  };
  more: {
    appearanceTitle: string;
    appearanceMeta: string;
    aboutTitle: string;
  };
  topbar: {
    /** settings: brand; console: dense; studio: large title only */
    showBrand: boolean;
    showDevice: boolean;
  };
};

const SETTINGS: PackVoice = {
  brand: "证书桥",
  loadingHint: "正在加载…",
  tabs: {
    [TabName.Home]: "首页",
    [TabName.Certs]: "证书",
    [TabName.Log]: "日志",
    [TabName.Hide]: "隐藏",
    [TabName.More]: "更多",
  },
  overview: {
    kicker: "信任状态",
    emptyActive: "尚未启用附加证书",
    metrics: { active: "已启用", custom: "自定义", baseline: "基线", store: "库内" },
    pipelineTitle: "内置证书",
    runtimeTitle: "本机信息",
    refresh: "刷新状态",
    reboot: "重启设备",
  },
  certs: {
    builtinTitle: "抓包应用证书",
    builtinMeta: "开关变更需重启后写入系统信任库",
    customTitle: "自定义证书",
    customEmpty: "暂无自定义证书",
    importLabel: "导入 CA",
    refresh: "刷新证书状态",
    hotTitle: "临时挂载",
  },
  log: {
    title: "活动日志",
    metaEmpty: "暂无日志",
    refresh: "刷新",
    clear: "清空",
    emptyFiltered: "没有该等级的日志",
    emptyAll: "暂无日志（安装 / 注入 / 配置变更后才会写入）",
  },
  hide: {
    switchTitle: "隐藏开关",
    switchMeta: "关闭后不再登记 try_umount",
    allowTitle: "启用挂载隐藏协助",
    allowOn: "注入 / 热挂载成功后登记 SuSFS try_umount",
    allowOff: "关闭时不写隐藏状态、不注册 umount",
    captureTitle: "抓包注意",
    captureMeta: "比开关更重要",
    introTitle: "挂载隐藏",
    introBody:
      "证书桥通过 bind mount 写入系统信任库。抓包软件与被抓包对象必须能看见该挂载，请先阅读上方「抓包注意」。",
    guideTitle: "隐藏说明",
    guideMeta: "按 Root 方案配置；换路径不能替代 umount",
    docsCta: "查看完整文档",
  },
  more: {
    appearanceTitle: "外观",
    appearanceMeta: "主题包会改变布局与文案语气",
    aboutTitle: "关于证书桥",
  },
  topbar: { showBrand: true, showDevice: true },
};

const CONSOLE: PackVoice = {
  brand: "CertBridge",
  loadingHint: "reading status…",
  tabs: {
    [TabName.Home]: "概览",
    [TabName.Certs]: "CA",
    [TabName.Log]: "LOG",
    [TabName.Hide]: "HIDE",
    [TabName.More]: "CFG",
  },
  overview: {
    kicker: "TRUST",
    emptyActive: "no addon active",
    metrics: { active: "ACTIVE", custom: "CUSTOM", baseline: "BASE", store: "STORE" },
    pipelineTitle: "PIPELINE",
    runtimeTitle: "RUNTIME",
    refresh: "REFRESH",
    reboot: "REBOOT",
  },
  certs: {
    builtinTitle: "BUILTIN CA",
    builtinMeta: "toggle → reboot to apply",
    customTitle: "CUSTOM CA",
    customEmpty: "empty",
    importLabel: "IMPORT",
    refresh: "SYNC STATUS",
    hotTitle: "HOT SESSION",
  },
  log: {
    title: "install.log",
    metaEmpty: "0 lines",
    refresh: "TAIL",
    clear: "TRUNCATE",
    emptyFiltered: "no match",
    emptyAll: "log empty",
  },
  hide: {
    switchTitle: "HIDE.ALLOW",
    switchMeta: "try_umount gate",
    allowTitle: "hide_allow",
    allowOn: "register after inject / hot",
    allowOff: "skip assist + clear state file",
    captureTitle: "WARN · CAPTURE",
    captureMeta: "umount kills CA visibility",
    introTitle: "MOUNT HIDE",
    introBody:
      "bind → cacerts. Do not umount Reqable / target apps or TLS breaks. Assist only registers path.",
    guideTitle: "PLAYBOOK",
    guideMeta: "Magisk / KSU / APatch",
    docsCta: "DOCS",
  },
  more: {
    appearanceTitle: "APPEARANCE",
    appearanceMeta: "pack = layout + voice",
    aboutTitle: "ABOUT",
  },
  topbar: { showBrand: false, showDevice: true },
};

const STUDIO: PackVoice = {
  brand: "证书桥",
  loadingHint: "正在准备…",
  tabs: {
    [TabName.Home]: "状态",
    [TabName.Certs]: "证书库",
    [TabName.Log]: "记录",
    [TabName.Hide]: "隐身",
    [TabName.More]: "设置",
  },
  overview: {
    kicker: "此刻",
    emptyActive: "还没有附加信任",
    metrics: { active: "生效中", custom: "自备", baseline: "系统基线", store: "合并库" },
    pipelineTitle: "证书管道",
    runtimeTitle: "运行环境",
    refresh: "立即刷新",
    reboot: "重启以生效",
  },
  certs: {
    builtinTitle: "抓包根证",
    builtinMeta: "开启后重启写入系统信任",
    customTitle: "你的证书",
    customEmpty: "空空如也，导入一张开始",
    importLabel: "导入文件",
    refresh: "同步状态",
    hotTitle: "免重启挂载",
  },
  log: {
    title: "运行记录",
    metaEmpty: "还没有写入",
    refresh: "更新",
    clear: "清空记录",
    emptyFiltered: "这个等级暂时没有内容",
    emptyAll: "安装或注入之后才会留下记录",
  },
  hide: {
    switchTitle: "隐身协助",
    switchMeta: "只影响本模块的登记",
    allowTitle: "打开隐身协助",
    allowOn: "下次注入时自动登记 umount",
    allowOff: "安静模式：不登记、不写状态",
    captureTitle: "抓包前请确认",
    captureMeta: "别对链路开卸载模块",
    introTitle: "关于隐身",
    introBody:
      "我们帮你减轻挂载痕迹，但 Reqable 与被抓对象必须看见证书。隐藏是给「其它要躲检测的 App」用的。",
    guideTitle: "怎么配",
    guideMeta: "诚实边界写在最下面",
    docsCta: "打开文档",
  },
  more: {
    appearanceTitle: "外观与主题",
    appearanceMeta: "换主题 = 换布局与说话方式",
    aboutTitle: "关于",
  },
  topbar: { showBrand: false, showDevice: false },
};

export const PACK_VOICE: Record<ThemePack, PackVoice> = {
  [ThemePack.Settings]: SETTINGS,
  [ThemePack.Console]: CONSOLE,
  [ThemePack.Studio]: STUDIO,
};

export function getPackVoice(pack: ThemePack): PackVoice {
  return PACK_VOICE[pack] ?? PACK_VOICE[ThemePack.Settings];
}
