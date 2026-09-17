import { MountMode, Experimental14System, TmpfsStyle } from "@/entities/module/enums";

export const MOUNT_MODES = {
  [MountMode.Compatible]: {
    value: MountMode.Compatible,
    label: "完整兼容",
    shortLabel: "兼容",
    meta: "运行时整库 bind，适用 Magisk / KernelSU / APatch",
    helpTitle: "完整兼容（默认）",
    helpBody: "运行时整库合并后绑定，不写 system 叠层。不依赖 Magic Mount 元模块。",
  },
  [MountMode.Magic]: {
    value: MountMode.Magic,
    label: "轻量 Magic",
    shortLabel: "轻量",
    meta: "仅叠附加证书；Android 14+ 仍对 APEX 做脚本注入",
    helpTitle: "轻量 Magic Mount",
    helpBody: "只把启用的附加证书叠进系统信任库。",
  },
} as const;

export const MOUNT_MODE_OPTIONS = [
  MOUNT_MODES[MountMode.Compatible],
  MOUNT_MODES[MountMode.Magic],
];

export const MOUNT_ROOT_NOTES = [
  { name: "Magisk", note: "自带 Magic Mount；隐藏需配合排除列表 + Zygisk 助手" },
  { name: "KernelSU", note: "建议 SuSFS 或 ZygiskNext/ReZygisk umount；需 path_umount" },
  { name: "APatch", note: "对目标 App 开「排除修改」+ Zygisk 助手" },
] as const;

export const MOUNT_HELP_FOOTNOTE = "切换后需重启生效。";

export const EXPERIMENTAL_14_SYSTEM = {
  [Experimental14System.Skip]: {
    value: Experimental14System.Skip,
    label: "跳过 system",
    meta: "默认：Android 14+ 不挂载 /system 证书路径，只脚本注入 APEX",
  },
  [Experimental14System.Auto]: {
    value: Experimental14System.Auto,
    label: "挂载 system",
    meta: "按上方挂载模式处理 system（兼容 bind / Magic 叠层）",
  },
} as const;

export const EXPERIMENTAL_14_SYSTEM_OPTIONS = [
  EXPERIMENTAL_14_SYSTEM[Experimental14System.Skip],
  EXPERIMENTAL_14_SYSTEM[Experimental14System.Auto],
];

export const EXPERIMENTAL_14_SYSTEM_FOOTNOTE =
  "仅 Android 14+ 生效，与挂载模式正交；7–13 忽略。切换后需重启。";

export const TMPFS_STYLES = {
  [TmpfsStyle.Dev]: {
    value: TmpfsStyle.Dev,
    label: "Dev 路径",
    meta: "默认：/dev/.fs*，避开 local/tmp 关键词",
    helpTitle: "Dev 路径（默认）",
    paths: ["/dev/.fs0", "/dev/.fs1"],
  },
  [TmpfsStyle.Mnt]: {
    value: TmpfsStyle.Mnt,
    label: "Mnt 路径",
    meta: "/mnt 下短名临时层",
    helpTitle: "Mnt 路径",
    paths: ["/mnt/.ca0", "/mnt/.ca1"],
  },
  [TmpfsStyle.Short]: {
    value: TmpfsStyle.Short,
    label: "短路径",
    meta: "local/tmp 下的 .fs0 / .fs1",
    helpTitle: "短路径",
    paths: ["/data/local/tmp/.fs0", "/data/local/tmp/.fs1"],
  },
  [TmpfsStyle.Legacy]: {
    value: TmpfsStyle.Legacy,
    label: "传统路径",
    meta: "可读旧路径，便于排障",
    helpTitle: "传统路径",
    paths: ["/data/local/tmp/sys-ca-merge", "/data/local/tmp/sys-ca-merge-hot"],
  },
} as const;

export const TMPFS_STYLE_OPTIONS = [
  TMPFS_STYLES[TmpfsStyle.Dev],
  TMPFS_STYLES[TmpfsStyle.Mnt],
  TMPFS_STYLES[TmpfsStyle.Short],
  TMPFS_STYLES[TmpfsStyle.Legacy],
];

export const TMPFS_HELP_FOOTNOTE =
  "仅影响完整兼容与热挂载临时层；切换后需重启。换路径不能替代 umount 隐藏。";

export const HIDE_PROVIDER_LABELS: Record<string, string> = {
  susfs: "SuSFS try_umount",
  rezygisk: "ReZygisk",
  neozygisk: "NeoZygisk",
  zygisknext: "ZygiskNext",
  shamiko: "Shamiko",
  zygisk_assistant: "Zygisk Assistant",
  nohello: "NoHello",
  magisk_denylist: "Magisk 排除列表",
  ksu_umount: "KernelSU 卸载模块",
  apatch_exclude: "APatch 排除修改",
  none: "未检测到",
};
