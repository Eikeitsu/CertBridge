export type ThemeMode = "system" | "light" | "dark";
export type ThemePack = "classic" | "material" | "fluid";
export type ResolvedTheme = "light" | "dark";

export type ExecResult = {
  errno: number;
  stdout: string;
  stderr: string;
};

export type ModuleStatus = {
  module_ok?: string;
  hot_supported?: string;
  disabled?: string;
  api?: string;
  release?: string;
  root?: string;
  active_count?: string;
  custom_count?: string;
  base_count?: string;
  store_count?: string;
  apex_ok?: string;
  pending_reboot?: string;
  inject_error?: string;
  inject_reason?: string;
  inject_message?: string;
  inject_hint?: string;
  desc_short?: string;
  desc_body?: string;
  status_cached?: string;
  reqable_enabled?: string;
  reqable_active?: string;
  reqable_available?: string;
  reqable_display?: string;
  reqable_title?: string;
  proxypin_enabled?: string;
  proxypin_active?: string;
  proxypin_available?: string;
  proxypin_display?: string;
  proxypin_title?: string;
  mount_mode?: string;
  tmpfs_style?: string;
  version?: string;
  hot_active?: string;
  hot_partial?: string;
  hot_stale?: string;
  hot_added?: string;
  hot_namespaces?: string;
  hot_failed?: string;
  hot_mode?: string;
  [key: string]: string | undefined;
};

export type CustomCertificate = {
  name: string;
  display: string;
};

export type TabName = "home" | "certs" | "log" | "more";

export type BuiltinCertKind = "reqable" | "proxypin";

export type MountMode = "compatible" | "magic";

export type TmpfsStyle = "short" | "legacy";

export type HotMountMode = "user" | "sd" | "all";
