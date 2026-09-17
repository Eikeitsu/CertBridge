import { TabName } from "@/entities/module/enums";

export const CONSOLE_VOICE = {
  brand: "certbridge",
  loading: "boot…",
  tabs: {
    [TabName.Home]: "home",
    [TabName.Certs]: "certs",
    [TabName.Log]: "log",
    [TabName.Hide]: "hide",
    [TabName.More]: "more",
  },
  home: {
    eyebrow: "trust.status",
    refresh: "refresh --live",
    reboot: "reboot",
    empty: "active=0",
    metrics: { active: "active", custom: "custom", baseline: "base" },
    pipeline: "builtin.ca",
    env: "env",
  },
  certs: {
    title: "certs",
    sub: "toggle requires reboot to commit",
    builtin: "builtin",
    custom: "custom",
    import: "import",
    refresh: "sync",
    hot: "hot.mount",
    empty: "custom=[]",
  },
  log: {
    title: "journal",
    refresh: "tail",
    clear: "truncate",
    empty: "no lines",
  },
  hide: {
    title: "hide",
    sub: "do not umount capture apps",
  },
  more: {
    title: "more",
    appearance: "appearance",
    appearanceMeta: "pack switches entire UI tree",
    about: "about",
  },
} as const;
