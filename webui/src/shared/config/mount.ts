import { MountMode, Experimental14System, TmpfsStyle } from "@/entities/module/enums";

export const MOUNT_MODES = {
  [MountMode.Compatible]: {
    value: MountMode.Compatible,
    labelKey: "mount.modes.compatible.label",
    shortLabelKey: "mount.modes.compatible.short",
    metaKey: "mount.modes.compatible.meta",
    helpTitleKey: "mount.modes.compatible.helpTitle",
    helpBodyKey: "mount.modes.compatible.helpBody",
  },
  [MountMode.Magic]: {
    value: MountMode.Magic,
    labelKey: "mount.modes.magic.label",
    shortLabelKey: "mount.modes.magic.short",
    metaKey: "mount.modes.magic.meta",
    helpTitleKey: "mount.modes.magic.helpTitle",
    helpBodyKey: "mount.modes.magic.helpBody",
  },
} as const;

export const MOUNT_MODE_OPTIONS = [
  MOUNT_MODES[MountMode.Compatible],
  MOUNT_MODES[MountMode.Magic],
];

/** 挂载子页：Magic Mount 元模块关系（不是隐藏助手说明） */
export const MOUNT_META_NOTES = [
  {
    name: "Magisk",
    noteKey: "mount.meta.magisk",
  },
  {
    name: "KernelSU",
    noteKey: "mount.meta.kernelsu",
  },
  {
    name: "APatch",
    noteKey: "mount.meta.apatch",
  },
] as const;

/** 隐藏页：各 Root 方案的隐藏要点（从挂载子页迁出） */
export const HIDE_ROOT_NOTES = [
  {
    name: "Magisk",
    noteKey: "hide.roots.magisk",
  },
  {
    name: "KernelSU",
    noteKey: "hide.roots.kernelsu",
  },
  {
    name: "APatch",
    noteKey: "hide.roots.apatch",
  },
] as const;

export const MOUNT_HELP_FOOTNOTE_KEY = "mount.modeFootnote";

export const EXPERIMENTAL_14_SYSTEM = {
  [Experimental14System.Skip]: {
    value: Experimental14System.Skip,
    labelKey: "mount.experimental14.skip.label",
    metaKey: "mount.experimental14.skip.meta",
  },
  [Experimental14System.Auto]: {
    value: Experimental14System.Auto,
    labelKey: "mount.experimental14.auto.label",
    metaKey: "mount.experimental14.auto.meta",
  },
} as const;

export const EXPERIMENTAL_14_SYSTEM_OPTIONS = [
  EXPERIMENTAL_14_SYSTEM[Experimental14System.Skip],
  EXPERIMENTAL_14_SYSTEM[Experimental14System.Auto],
];

export const EXPERIMENTAL_14_SYSTEM_FOOTNOTE_KEY = "mount.experimental14.footnote";

export const TMPFS_STYLES = {
  [TmpfsStyle.Dev]: {
    value: TmpfsStyle.Dev,
    labelKey: "mount.tmpfs.dev.label",
    metaKey: "mount.tmpfs.dev.meta",
    helpTitleKey: "mount.tmpfs.dev.helpTitle",
    paths: ["/dev/.fs0", "/dev/.fs1"],
  },
  [TmpfsStyle.Mnt]: {
    value: TmpfsStyle.Mnt,
    labelKey: "mount.tmpfs.mnt.label",
    metaKey: "mount.tmpfs.mnt.meta",
    helpTitleKey: "mount.tmpfs.mnt.helpTitle",
    paths: ["/mnt/.ca0", "/mnt/.ca1"],
  },
  [TmpfsStyle.Short]: {
    value: TmpfsStyle.Short,
    labelKey: "mount.tmpfs.short.label",
    metaKey: "mount.tmpfs.short.meta",
    helpTitleKey: "mount.tmpfs.short.helpTitle",
    paths: ["/data/local/tmp/.fs0", "/data/local/tmp/.fs1"],
  },
  [TmpfsStyle.Legacy]: {
    value: TmpfsStyle.Legacy,
    labelKey: "mount.tmpfs.legacy.label",
    metaKey: "mount.tmpfs.legacy.meta",
    helpTitleKey: "mount.tmpfs.legacy.helpTitle",
    paths: ["/data/local/tmp/sys-ca-merge", "/data/local/tmp/sys-ca-merge-hot"],
  },
} as const;

export const TMPFS_STYLE_OPTIONS = [
  TMPFS_STYLES[TmpfsStyle.Dev],
  TMPFS_STYLES[TmpfsStyle.Mnt],
  TMPFS_STYLES[TmpfsStyle.Short],
  TMPFS_STYLES[TmpfsStyle.Legacy],
];

export const TMPFS_HELP_FOOTNOTE_KEY = "mount.tmpfsFootnote";

export const HIDE_PROVIDER_LABELS: Record<string, string> = {
  ksud: "mount.providers.ksud",
  susfs: "mount.providers.susfs",
  rezygisk: "mount.providers.rezygisk",
  neozygisk: "mount.providers.neozygisk",
  zygisknext: "mount.providers.zygisknext",
  shamiko: "mount.providers.shamiko",
  zygisk_assistant: "mount.providers.zygiskAssistant",
  nohello: "mount.providers.nohello",
  magisk_denylist: "mount.providers.magiskDenylist",
  ksu_umount: "mount.providers.ksuUmount",
  apatch_exclude: "mount.providers.apatchExclude",
  none: "mount.providers.none",
};
