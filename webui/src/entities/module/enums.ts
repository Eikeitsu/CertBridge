/** 主题模式（写入 localStorage） */
export enum ThemeMode {
  System = "system",
  Light = "light",
  Dark = "dark",
}

/** 壳层气质包：默认（正常）| 控制台（终端） */
export enum ThemePack {
  Default = "default",
  Console = "console",
}

/** 解析后的实际深浅色 */
export enum ResolvedTheme {
  Light = "light",
  Dark = "dark",
}

export enum TabName {
  Home = "home",
  Certs = "certs",
  Log = "log",
  Hide = "hide",
  More = "more",
}

export enum BuiltinCertKind {
  Reqable = "reqable",
  Proxypin = "proxypin",
}

export enum MountMode {
  Compatible = "compatible",
  Magic = "magic",
}

export enum TmpfsStyle {
  Dev = "dev",
  Short = "short",
  Legacy = "legacy",
}

export enum HotMountMode {
  User = "user",
  Sd = "sd",
  All = "all",
}

export enum TrustTone {
  Ok = "ok",
  Warn = "warn",
  Bad = "bad",
  Idle = "idle",
}

export enum FlagTone {
  Warn = "warn",
  Info = "info",
  Ok = "ok",
}

export enum LogLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
  Debug = "debug",
}

export function isLogLevel(value: unknown): value is LogLevel {
  return Object.values(LogLevel).includes(value as LogLevel);
}
