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
    showBrand: boolean;
    showDevice: boolean;
  };
};

const SHARED_HIDE: PackVoice["hide"] = {
  switchTitle: "隐藏开关",
  switchMeta: "关闭后不再登记 try_umount",
  allowTitle: "启用挂载隐藏协助",
  allowOn: "注入 / 热挂载成功后登记 umount 路径（有内核能力时）",
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
  },
  topbar: { showBrand: false, showDevice: false },
};

export const APP_VOICE = DEFAULT_VOICE;

export function getPackVoice(pack?: ThemePack | null): PackVoice {
  if (pack === ThemePack.Console) return CONSOLE_VOICE;
  return DEFAULT_VOICE;
}
