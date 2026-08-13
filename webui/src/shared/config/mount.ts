import { MountMode, TmpfsStyle } from "@/entities/module/enums";

export const MOUNT_MODES = {
  [MountMode.Compatible]: {
    value: MountMode.Compatible,
    label: "完整兼容",
    shortLabel: "兼容",
    meta: "完整兼容：整库合并绑定，适用 Magisk / KernelSU / APatch",
    helpTitle: "完整兼容（默认）",
    helpBody: "运行时整库合并后绑定，不写 system 叠层。不依赖 Magic Mount 元模块。",
  },
  [MountMode.Magic]: {
    value: MountMode.Magic,
    label: "轻量 Magic",
    shortLabel: "轻量",
    meta: "轻量 Magic：仅叠附加证书；异常时请改回完整兼容",
    helpTitle: "轻量 Magic Mount",
    helpBody: "只把当前启用的附加证书叠进系统信任库；Android 14+ 仍对 APEX 做脚本注入。",
  },
} as const;

export const MOUNT_MODE_OPTIONS = [
  MOUNT_MODES[MountMode.Compatible],
  MOUNT_MODES[MountMode.Magic],
];

export const MOUNT_ROOT_NOTES = [
  { name: "Magisk", note: "自带 Magic Mount，一般不需要元模块" },
  { name: "KernelSU", note: "需管理器正确叠层；若系统 CA 只剩几张，请改回完整兼容" },
  { name: "APatch", note: "视版本而定，异常时用完整兼容" },
] as const;

export const MOUNT_HELP_FOOTNOTE = "切换后需重启生效。";

export const TMPFS_STYLES = {
  [TmpfsStyle.Short]: {
    value: TmpfsStyle.Short,
    label: "短路径",
    meta: "短路径更不易被按关键词扫到（收益有限）",
    helpTitle: "短路径（默认）",
    paths: ["/data/local/tmp/.fs0", "/data/local/tmp/.fs1"],
  },
  [TmpfsStyle.Legacy]: {
    value: TmpfsStyle.Legacy,
    label: "传统路径",
    meta: "传统路径名称更直观，便于排障",
    helpTitle: "传统路径",
    paths: ["/data/local/tmp/sys-ca-merge", "/data/local/tmp/sys-ca-merge-hot"],
  },
} as const;

export const TMPFS_STYLE_OPTIONS = [
  TMPFS_STYLES[TmpfsStyle.Short],
  TMPFS_STYLES[TmpfsStyle.Legacy],
];

export const TMPFS_HELP_FOOTNOTE =
  "仅影响完整兼容与热挂载临时层；切换后需重启。卸载时会清理两套路径。";
