import { TabName } from "@/entities/module/enums";

export const DEFAULT_VOICE = {
  brand: "证书桥",
  loading: "正在加载…",
  tabs: {
    [TabName.Home]: "首页",
    [TabName.Certs]: "证书",
    [TabName.Log]: "日志",
    [TabName.Hide]: "隐藏",
    [TabName.More]: "更多",
  },
  home: {
    eyebrow: "系统信任",
    refresh: "刷新复核",
    reboot: "重启设备",
    empty: "尚未启用附加证书",
    metrics: { active: "生效中", custom: "自定义", baseline: "基线" },
    pipeline: "抓包 CA",
    env: "设备环境",
  },
  certs: {
    title: "证书管理",
    sub: "开关写入系统信任库，部分变更需重启",
    builtin: "应用证书",
    custom: "自定义",
    import: "导入文件",
    refresh: "同步状态",
    hot: "临时挂载",
    empty: "还没有自定义证书",
  },
  log: {
    title: "活动日志",
    refresh: "刷新",
    clear: "清空",
    empty: "暂无日志",
  },
  hide: {
    title: "挂载隐藏",
    sub: "抓包链路相关 App 不要开卸载模块",
  },
  more: {
    title: "更多",
    appearance: "外观与主题",
    appearanceMeta: "三套主题各自一套版式，不只是换皮",
    about: "关于",
  },
} as const;
