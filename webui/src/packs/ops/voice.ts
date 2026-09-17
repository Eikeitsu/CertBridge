import { TabName } from "@/entities/module/enums";

/** Ops pack copy */
export const OPS_VOICE = {
  brand: "证书桥",
  loading: "加载中…",
  tabs: {
    [TabName.Home]: "概览",
    [TabName.Certs]: "证书",
    [TabName.Log]: "日志",
    [TabName.Hide]: "隐藏",
    [TabName.More]: "更多",
  },
  home: {
    eyebrow: "运行状态",
    refresh: "刷新",
    reboot: "重启",
    empty: "暂无生效证书",
    metrics: { active: "生效", custom: "自定义", baseline: "基线" },
    pipeline: "抓包 CA",
    env: "环境",
  },
  certs: {
    title: "证书",
    sub: "开关变更需重启后永久生效",
    builtin: "内置",
    custom: "自定义",
    import: "导入",
    refresh: "同步",
    hot: "临时挂载",
    empty: "还没有自定义证书",
  },
  log: {
    title: "日志",
    refresh: "刷新",
    clear: "清空",
    empty: "暂无日志",
  },
  hide: {
    title: "隐藏",
    sub: "勿对抓包链路开启 umount",
  },
  more: {
    title: "更多",
    appearance: "外观",
    appearanceMeta: "换主题会切换整套页面结构",
    about: "关于",
  },
} as const;
