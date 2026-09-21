import { TabName, ThemePack } from "@/entities/module/enums";

export type PackVoice = {
  brand: string;
  loadingHint: string;
  tabs: Record<TabName, string>;
  overview: {
    kicker: string;
    emptyActive: string;
    metrics: {
      active: string;
      custom: string;
      baseline: string;
      store: string;
    };
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
    forceBindTitle: string;
    forceBindOn: string;
    forceBindOff: string;
    forceBindToastOn: string;
    forceBindToastOff: string;
    forceBindConfirmOnTitle: string;
    forceBindConfirmOnBody: string;
    forceBindConfirmOnOk: string;
    lateInjectTitle: string;
    lateInjectOn: string;
    lateInjectOff: string;
    lateInjectToastOn: string;
    lateInjectToastOff: string;
    lateInjectConfirmOnTitle: string;
    lateInjectConfirmOnBody: string;
    lateInjectConfirmOnOk: string;
    experimentEntryTitle: string;
    experimentEntryMeta: string;
    experimentEntryCta: string;
    experimentSheetTitle: string;
    experimentIntro: string;
    bootZygoteTitle: string;
    bootZygoteOn: string;
    bootZygoteOff: string;
    bootZygoteToastOn: string;
    bootZygoteToastOff: string;
    bootZygoteConfirmOnTitle: string;
    bootZygoteConfirmOnBody: string;
    bootZygoteConfirmOnOk: string;
    bootMultiApexTitle: string;
    bootMultiApexOn: string;
    bootMultiApexOff: string;
    bootMultiApexToastOn: string;
    bootMultiApexToastOff: string;
    bootMultiApexConfirmOnTitle: string;
    bootMultiApexConfirmOnBody: string;
    bootMultiApexConfirmOnOk: string;
    serviceProbeTitle: string;
    serviceProbeOn: string;
    serviceProbeOff: string;
    serviceProbeToastOn: string;
    serviceProbeToastOff: string;
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
    hubMeta: string;
    mountTitle: string;
    mountMeta: string;
    navTitle: string;
    navMeta: string;
    showHideTitle: string;
    showHideDesc: string;
  };
  topbar: {
    showBrand: boolean;
    showDevice: boolean;
  };
};

const SHARED_HIDE: PackVoice["hide"] = {
  switchTitle: "隐藏开关",
  switchMeta: "关闭后不再登记 try_umount",
  allowTitle: "启用挂载隐藏协助",
  allowOn: "注入 / 热挂载成功后登记 umount 路径（SuSFS / ksud / NoHello）",
  allowOff: "关闭时不写隐藏状态、不注册 umount",
  toastOn: "已开启（后台登记 try_umount）",
  toastOff: "已关闭（清列表 + 尝试 ksud del）",
  confirmOffTitle: "关闭挂载隐藏协助？",
  confirmOffBody:
    "关闭后不再登记 umount，并立刻清 try_umount.txt / NoHello；有 ksud 时会 kernel umount del 本模块路径。无 ksud 的旧内核若仍残留，重启后才会清。",
  confirmOffOk: "关闭",
  forceBindTitle: "强注抓包 App（旧行为）",
  forceBindOn: "对运行中的 Reqable/ProxyPin 补绑；开着「卸载模块」也可能显示证书已安装",
  forceBindOff: "默认：尊重卸载模块，不强注抓包 App",
  forceBindToastOn: "已开启强注（后台补绑运行中的抓包 App）",
  forceBindToastOff: "已关闭强注；请强停抓包 App 再开",
  forceBindConfirmOnTitle: "开启强注抓包 App？",
  forceBindConfirmOnBody:
    "开启后会对正在运行的 Reqable、ProxyPin 补绑证书层，并可能盖掉 KSU「卸载模块」已卸的挂载（旧版行为）。会削弱对该 App 的隐藏效果，仅建议抓包调试时短期开启。无需整机重启。",
  forceBindConfirmOnOk: "开启",
  lateInjectTitle: "开机后晚注入（兼容）",
  lateInjectOn: "boot_completed 后 service 再跑应用命名空间注入；难机更稳，痕迹也更多",
  lateInjectOff: "默认：仅 boot 注入，service 只收尾写状态（痕迹更少）",
  lateInjectToastOn: "已开启晚注入（后台补一次命名空间）",
  lateInjectToastOff: "已关闭晚注入；下次开机 service 不再 namespaces 注入",
  lateInjectConfirmOnTitle: "开启开机后晚注入？",
  lateInjectConfirmOnBody:
    "开启后本次会后台补一次应用命名空间注入，之后每次开机 boot_completed 时 service 也会再注入。可提高难机兼容，但会增加对进程命名空间的介入（部分环境可能加重 Found KSU 类误伤）。仅建议证书不生效时短期开启。",
  lateInjectConfirmOnOk: "开启",
  experimentEntryTitle: "冷门实验",
  experimentEntryMeta: "默认痕迹最少；证书异常时再打开兼容项",
  experimentEntryCta: "打开冷门实验选项",
  experimentSheetTitle: "冷门实验选项",
  experimentIntro:
    "下列开关默认偏痕迹最少。证书不生效或难机再逐项打开；改开机相关项后需重启。",
  bootZygoteTitle: "开机注入 Zygote",
  bootZygoteOn: "boot 时对 zygote 做 bind（兼容更好，痕迹更多）",
  bootZygoteOff: "默认：仅 bind init，不进 zygote（痕迹更少）",
  bootZygoteToastOn: "已开启开机 Zygote 注入；重启后生效",
  bootZygoteToastOff: "已关闭开机 Zygote 注入；重启后生效",
  bootZygoteConfirmOnTitle: "开启开机 Zygote 注入？",
  bootZygoteConfirmOnBody:
    "开启后开机会对 zygote 做 nsenter bind，兼容更好，但更容易被 Found KSU 类检测盯上。改后需重启。",
  bootZygoteConfirmOnOk: "开启",
  bootMultiApexTitle: "完整 boot 注入目标",
  bootMultiApexOn: "按双模式注入（主 APEX + @版本；system 仍受挂载模式控制）",
  bootMultiApexOff: "默认精简：14+ 仅主 APEX（跳过 @版本与 system）；7–13 仍绑 system",
  bootMultiApexToastOn: "已开启完整目标列表；重启后生效",
  bootMultiApexToastOff: "已改回精简 boot 目标；重启后生效",
  bootMultiApexConfirmOnTitle: "开启完整 boot 目标？",
  bootMultiApexConfirmOnBody:
    "开启后按挂载模式注入全部目标（含 conscrypt@版本 等），兼容更好、痕迹更多。改后需重启。",
  bootMultiApexConfirmOnOk: "开启完整目标",
  serviceProbeTitle: "晚注入时的状态复核",
  serviceProbeOn: "late_inject=1 时：service 退避校验 + 延迟 heal",
  serviceProbeOff: "默认关；即使开了晚注入也不退避/heal（late_inject=0 时本项无影响）",
  serviceProbeToastOn: "已开启晚注入状态复核；下次开机且 late_inject=1 时生效",
  serviceProbeToastOff: "已关闭晚注入状态复核；下次开机生效",
  znSwitchTitle: "Zygisk 挂载过滤",
  znSwitchMeta: "过滤 mountinfo / maps，并弱化 so 路径泄露",
  znAllowTitle: "启用 Zygisk 挂载痕迹过滤",
  znAllowOn:
    "过滤 mount/maps/smaps；Reqable/ProxyPin 白名单不过滤（需 Zygisk；强停 App 生效）",
  znAllowOff: "关闭后不再挂钩；已运行进程需强停才恢复",
  znToastOn: "已开启 Zygisk 过滤（强停相关 App 后生效）",
  znToastOff: "已关闭 Zygisk 过滤（已运行进程需强停）",
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
};

const SHARED_CERTS: PackVoice["certs"] = {
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
};

const DEFAULT_VOICE: PackVoice = {
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
    metrics: {
      active: "已启用",
      custom: "自定义",
      baseline: "基线",
      store: "库内",
    },
    pipelineTitle: "内置证书",
    runtimeTitle: "环境详情",
    refresh: "刷新复核",
    reboot: "重启设备",
  },
  certs: SHARED_CERTS,
  log: {
    title: "活动日志",
    metaEmpty: "暂无日志",
    refresh: "刷新",
    clear: "清空",
    emptyFiltered: "没有该等级的日志",
    emptyAll: "暂无日志（安装 / 注入 / 配置变更后才会写入）",
  },
  hide: SHARED_HIDE,
  more: {
    appearanceTitle: "外观",
    appearanceMeta: "主题包、浅深色与强调色",
    aboutTitle: "关于证书桥",
    hubMeta: "外观、挂载与更新；少用的选项放进二级页",
    mountTitle: "挂载与注入",
    mountMeta: "挂载模式、A14 路径、tmpfs、动态简介",
    navTitle: "导航",
    navMeta: "自定义底栏显示的页面",
    showHideTitle: "显示「隐藏」页",
    showHideDesc: "关闭后底栏不再出现隐藏 Tab",
  },
  topbar: { showBrand: true, showDevice: true },
};

const CONSOLE_VOICE: PackVoice = {
  ...DEFAULT_VOICE,
  brand: "CERTBRIDGE",
  loadingHint: "loading…",
  tabs: {
    [TabName.Home]: "HOME",
    [TabName.Certs]: "CERTS",
    [TabName.Log]: "LOG",
    [TabName.Hide]: "HIDE",
    [TabName.More]: "MORE",
  },
  overview: {
    kicker: "TRUST",
    emptyActive: "no active addon CA",
    metrics: {
      active: "ACTIVE",
      custom: "CUSTOM",
      baseline: "BASE",
      store: "STORE",
    },
    pipelineTitle: "BUILTIN",
    runtimeTitle: "ENV",
    refresh: "REFRESH",
    reboot: "REBOOT",
  },
  log: {
    title: "JOURNAL",
    metaEmpty: "empty",
    refresh: "RELOAD",
    clear: "CLEAR",
    emptyFiltered: "no lines for level",
    emptyAll: "no journal yet",
  },
  more: {
    appearanceTitle: "APPEARANCE",
    appearanceMeta: "pack / mode / accent",
    aboutTitle: "ABOUT",
    hubMeta: "settings hub — deep options in subviews",
    mountTitle: "MOUNT",
    mountMeta: "mode / a14 / tmpfs / quiet",
    navTitle: "NAV",
    navMeta: "dock visibility",
    showHideTitle: "show HIDE tab",
    showHideDesc: "off = hide dock entry",
  },
  topbar: { showBrand: false, showDevice: false },
};

export const APP_VOICE = DEFAULT_VOICE;

export function getPackVoice(pack?: ThemePack | null): PackVoice {
  if (pack === ThemePack.Console) return CONSOLE_VOICE;
  return DEFAULT_VOICE;
}
