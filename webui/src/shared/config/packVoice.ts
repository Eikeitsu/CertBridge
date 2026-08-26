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
    detailLabel: string;
    refresh: string;
    hotTitle: string;
    presetsTitle: string;
    presetsMeta: string;
    exportFps: string;
    exportFpsEmpty: string;
    exportFpsOk: string;
    presetUnchanged: string;
    importReadFail: string;
    removeConfirmTitle: string;
    removeConfirmBody: string;
    removeConfirmOk: string;
    hotAllowOn: string;
    hotAllowOff: string;
    hotConfirmOffTitle: string;
    hotConfirmOffBody: string;
    hotConfirmOffOk: string;
    hotSdPathBad: string;
    hotMountConfirmBody: string;
    hotMountConfirmOk: string;
    hotMounting: string;
    hotUnmountConfirmTitle: string;
    hotUnmountConfirmBody: string;
    hotUnmountConfirmOk: string;
    hotUnmounting: string;
    hotUnmounted: string;
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
    toastOn: string;
    toastOff: string;
    confirmOffTitle: string;
    confirmOffBody: string;
    confirmOffOk: string;
    znSwitchTitle: string;
    znSwitchMeta: string;
    znAllowTitle: string;
    znAllowOn: string;
    znAllowOff: string;
    znToastOn: string;
    znToastOff: string;
    znConfirmOffTitle: string;
    znConfirmOffBody: string;
    znConfirmOffOk: string;
    znMissingTitle: string;
    znMissingMeta: string;
    znMissingBody: string;
    loaderWarnTitle: string;
    loaderWarnMeta: string;
    loaderWarnBody: string;
    whitelistTitle: string;
    whitelistMeta: string;
    whitelistHint: string;
    whitelistSave: string;
    whitelistSaved: string;
    checklistTitle: string;
    checklistMeta: string;
    checklistDismiss: string;
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
    detailLabel: "详情",
    refresh: "刷新证书状态",
    hotTitle: "临时挂载",
    presetsTitle: "从常见路径导入",
    presetsMeta: "探测 Download / App 目录中的 CA",
    exportFps: "复制已应用指纹",
    exportFpsEmpty: "当前没有已应用的证书指纹",
    exportFpsOk: "已复制指纹列表",
    presetUnchanged: "该证书已在自定义列表中",
    importReadFail: "读取文件失败",
    removeConfirmTitle: "移除自定义证书？",
    removeConfirmBody: "重启后才会从系统信任库撤下。",
    removeConfirmOk: "移除",
    hotAllowOn: "已允许手动临时挂载",
    hotAllowOff: "已关闭临时挂载",
    hotConfirmOffTitle: "关闭临时挂载？",
    hotConfirmOffBody: "关闭后无法新建临时会话；若当前有会话，将一并无痕卸载。",
    hotConfirmOffOk: "关闭",
    hotSdPathBad: "存储卡路径不安全或不受支持",
    hotMountConfirmBody: "无需重启，仅建立临时会话；重启后自动失效。",
    hotMountConfirmOk: "挂载",
    hotMounting: "正在建立临时证书会话…",
    hotUnmountConfirmTitle: "无痕卸载当前临时证书会话？",
    hotUnmountConfirmBody: "永久配置与系统文件不会改变。",
    hotUnmountConfirmOk: "卸载",
    hotUnmounting: "正在安全卸载临时证书…",
    hotUnmounted: "临时证书已无痕卸载",
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
    toastOn: "已开启隐藏协助（下次注入 / 热挂载时登记）",
    toastOff: "已关闭隐藏协助（重启后清除内核登记）",
    confirmOffTitle: "关闭挂载隐藏协助？",
    confirmOffBody:
      "关闭后不再向 SuSFS / 内核注册 try_umount。已登记项需重启后才会从内核清除。",
    confirmOffOk: "关闭",
    znSwitchTitle: "Zygisk 挂载过滤",
    znSwitchMeta: "过滤 mountinfo / maps，并弱化 so 路径泄露",
    znAllowTitle: "启用 Zygisk 挂载痕迹过滤",
    znAllowOn:
      "过滤 mount/maps/smaps；Reqable/ProxyPin 白名单不过滤（需 Zygisk；重启 App 生效）",
    znAllowOff: "关闭后不再挂钩；已运行进程需重启才恢复",
    znToastOn: "已开启 Zygisk 过滤（mount/maps；重启相关 App 后生效）",
    znToastOff: "已关闭 Zygisk 挂载过滤（已运行进程需重启）",
    znConfirmOffTitle: "关闭 Zygisk 挂载过滤？",
    znConfirmOffBody:
      "关闭后新启动的 App 不再过滤 mountinfo/maps。已运行中的进程需强停或重启后才会去掉挂钩。",
    znConfirmOffOk: "关闭",
    znMissingTitle: "未安装 Zygisk 过滤",
    znMissingMeta: "默认安装不含此项",
    znMissingBody:
      "maps 自藏与 mountinfo 过滤需重新刷入模块，在自定义安装中勾选「Zygisk 挂载痕迹过滤」。发布包需含 zygisk/*.so，并启用 Zygisk / ZygiskNext 等。",
    loaderWarnTitle: "未检测到 Zygisk 底座",
    loaderWarnMeta: "组件已装但可能无法注入",
    loaderWarnBody:
      "本机未识别到 ZygiskNext / ReZygisk / NeoZygisk 或 Magisk 内置 Zygisk。过滤 so 已安装，但 App 进程可能不会被注入。请在管理器中启用 Zygisk 后再试。",
    whitelistTitle: "抓包白名单",
    whitelistMeta: "名单内不过滤 mount/maps",
    whitelistHint:
      "一行一个包名；# 开头为注释。默认含 Reqable / ProxyPin。保存后强停相关 App 生效。",
    whitelistSave: "保存白名单",
    whitelistSaved: "白名单已保存（强停 App 后生效）",
    checklistTitle: "抓包检查清单",
    checklistMeta: "首次建议过一遍",
    checklistDismiss: "知道了，不再显示",
    captureTitle: "抓包注意",
    captureMeta: "比开关更重要",
    introTitle: "挂载隐藏",
    introBody:
      "证书桥通过 bind mount 写入系统信任库。可选 SuSFS try_umount 与 Zygisk 过滤（mountinfo/maps）。抓包软件与被抓包对象必须能看见该挂载，请先阅读上方「抓包注意」。",
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
    detailLabel: "INFO",
    refresh: "SYNC STATUS",
    hotTitle: "HOT SESSION",
    presetsTitle: "PATH PRESETS",
    presetsMeta: "Download / app dirs",
    exportFps: "COPY APPLIED FPS",
    exportFpsEmpty: "no applied fingerprints",
    exportFpsOk: "fingerprints copied",
    presetUnchanged: "already in custom list",
    importReadFail: "read file failed",
    removeConfirmTitle: "remove custom CA?",
    removeConfirmBody: "removed from system trust after reboot.",
    removeConfirmOk: "REMOVE",
    hotAllowOn: "hot_allow=1",
    hotAllowOff: "hot_allow=0",
    hotConfirmOffTitle: "disable hot mount?",
    hotConfirmOffBody: "no new sessions; active session will unmount.",
    hotConfirmOffOk: "OFF",
    hotSdPathBad: "sd path unsafe / unsupported",
    hotMountConfirmBody: "temp session only; gone after reboot.",
    hotMountConfirmOk: "MOUNT",
    hotMounting: "building hot session…",
    hotUnmountConfirmTitle: "unmount hot session?",
    hotUnmountConfirmBody: "permanent config untouched.",
    hotUnmountConfirmOk: "UNMOUNT",
    hotUnmounting: "tearing down hot session…",
    hotUnmounted: "hot session cleared",
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
    toastOn: "hide_allow=1 (register on next inject/hot)",
    toastOff: "hide_allow=0 (clears after reboot)",
    confirmOffTitle: "disable hide_allow?",
    confirmOffBody: "stops SuSFS try_umount registration; kernel entries clear after reboot.",
    confirmOffOk: "OFF",
    znSwitchTitle: "ZN.HIDE",
    znSwitchMeta: "mountinfo + maps + readlink scrub",
    znAllowTitle: "zn_hide_allow",
    znAllowOn: "filter mount/maps; Reqable/ProxyPin whitelisted",
    znAllowOff: "no hooks; restart apps after change",
    znToastOn: "zn_hide_allow=1 (restart apps)",
    znToastOff: "zn_hide_allow=0 (restart running apps)",
    znConfirmOffTitle: "disable zn_hide_allow?",
    znConfirmOffBody: "new apps skip filter; running processes need force-stop.",
    znConfirmOffOk: "OFF",
    znMissingTitle: "ZN.HIDE MISSING",
    znMissingMeta: "not in default install",
    znMissingBody:
      "Reflash with custom install → enable Zygisk mount-trace filter. Needs zygisk/*.so + Zygisk loader.",
    loaderWarnTitle: "NO ZYGISK LOADER",
    loaderWarnMeta: "so installed, inject may be noop",
    loaderWarnBody:
      "No ZygiskNext / ReZygisk / NeoZygisk / Magisk Zygisk detected. Enable a Zygisk provider.",
    whitelistTitle: "CAPTURE WHITELIST",
    whitelistMeta: "skip mount/maps filter",
    whitelistHint: "one package per line; # comments. Force-stop apps after save.",
    whitelistSave: "SAVE",
    whitelistSaved: "whitelist saved (force-stop apps)",
    checklistTitle: "CAPTURE CHECKLIST",
    checklistMeta: "first-run",
    checklistDismiss: "DISMISS",
    captureTitle: "WARN · CAPTURE",
    captureMeta: "umount kills CA visibility",
    introTitle: "MOUNT HIDE",
    introBody:
      "bind → cacerts. SuSFS try_umount + optional Zygisk maps scrub. Do not umount Reqable / target apps.",
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
    detailLabel: "查看",
    refresh: "同步状态",
    hotTitle: "免重启挂载",
    presetsTitle: "一键找证书",
    presetsMeta: "扫下载目录与常见 App 路径",
    exportFps: "复制生效指纹",
    exportFpsEmpty: "还没有生效中的指纹",
    exportFpsOk: "指纹列表已复制",
    presetUnchanged: "这张已经在你的自定义列表里了",
    importReadFail: "文件读不出来",
    removeConfirmTitle: "去掉这张自定义证书？",
    removeConfirmBody: "重启之后才会从系统信任里撤掉。",
    removeConfirmOk: "去掉",
    hotAllowOn: "可以手动做临时挂载了",
    hotAllowOff: "临时挂载已关掉",
    hotConfirmOffTitle: "关掉临时挂载？",
    hotConfirmOffBody: "关掉后不能新建会话；如果现在有会话，会一起卸掉。",
    hotConfirmOffOk: "关掉",
    hotSdPathBad: "这个存储卡路径不安全或不支持",
    hotMountConfirmBody: "马上生效，不用重启；重启后自动没了。",
    hotMountConfirmOk: "挂上",
    hotMounting: "正在搭临时证书会话…",
    hotUnmountConfirmTitle: "卸掉当前临时证书？",
    hotUnmountConfirmBody: "永久配置和系统文件都不会动。",
    hotUnmountConfirmOk: "卸掉",
    hotUnmounting: "正在安全卸掉临时证书…",
    hotUnmounted: "临时证书已经卸干净了",
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
    toastOn: "隐身协助已打开，下次注入时登记",
    toastOff: "隐身协助已关掉，重启后内核登记会清",
    confirmOffTitle: "关掉隐身协助？",
    confirmOffBody: "关掉后不再登记 try_umount；已经登记的要重启才从内核消失。",
    confirmOffOk: "关掉",
    znSwitchTitle: "Zygisk 过滤",
    znSwitchMeta: "藏起 mountinfo / maps 里的本模块痕迹",
    znAllowTitle: "打开 Zygisk 挂载过滤",
    znAllowOn: "过滤 mount/maps；Reqable/ProxyPin 不过滤（需 Zygisk）",
    znAllowOff: "关掉挂钩；改完请重启相关 App",
    znToastOn: "Zygisk 过滤已打开，请重启相关 App",
    znToastOff: "Zygisk 过滤已关掉，运行中的 App 请强停",
    znConfirmOffTitle: "关掉 Zygisk 过滤？",
    znConfirmOffBody: "新启动的 App 不再过滤；已经跑着的要强停或重启。",
    znConfirmOffOk: "关掉",
    znMissingTitle: "还没装 Zygisk 过滤",
    znMissingMeta: "默认安装不含",
    znMissingBody:
      "想要 maps 自藏：重新刷入，自定义安装勾选「Zygisk 挂载痕迹过滤」，并确保设备已开 Zygisk。",
    loaderWarnTitle: "没找到 Zygisk 底座",
    loaderWarnMeta: "过滤组件在，但可能注不进去",
    loaderWarnBody:
      "没检测到 ZygiskNext / ReZygisk / NeoZygisk 或 Magisk 内置 Zygisk。先在管理器里打开 Zygisk 再抓包/测隐藏。",
    whitelistTitle: "抓包白名单",
    whitelistMeta: "这些包不会被过滤",
    whitelistHint: "一行一个包名，# 是注释。默认有 Reqable / ProxyPin。改完请强停 App。",
    whitelistSave: "保存名单",
    whitelistSaved: "名单已保存，强停 App 后生效",
    checklistTitle: "抓包前检查一下",
    checklistMeta: "第一次打开会看到",
    checklistDismiss: "好的，以后别烦我",
    captureTitle: "抓包前请确认",
    captureMeta: "别对链路开卸载模块",
    introTitle: "关于隐身",
    introBody:
      "SuSFS 登记 umount，Zygisk 可再滤 mount/maps。Reqable 与被抓对象必须看见证书。",
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
