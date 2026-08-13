/** 主题模式（写入 localStorage） */
export enum ThemeMode {
  System = "system",
  Light = "light",
  Dark = "dark",
}

/** 主题包（写入 localStorage / data-pack） */
export enum ThemePack {
  Classic = "classic",
  Material = "material",
  Fluid = "fluid",
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
  More = "more",
}

export enum BuiltinCertKind {
  Reqable = "reqable",
  ProxyPin = "proxypin",
}

export enum MountMode {
  Compatible = "compatible",
  Magic = "magic",
}

export enum TmpfsStyle {
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
}
