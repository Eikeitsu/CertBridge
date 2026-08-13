import { BuiltinCertKind, HotMountMode, ResolvedTheme } from "@/entities/module/enums";

export type DnAttributeKey =
  "cn" | "o" | "ou" | "l" | "st" | "c" | "email" | "dc" | "uid";

export const CERT_IMPORT_ACCEPT = [".pem", ".crt", ".cer", ".der", ".0"] as const;

export const CERT_EXPIRY_WARN_DAYS = 30;
export const MS_PER_DAY = 86_400_000;

export const CERT_INFO_KEYS = [
  "ok",
  "error",
  "display_name",
  "filename",
  "subject",
  "issuer",
  "not_before",
  "not_after",
  "hash",
  "fingerprint_sha256",
  "fingerprint_sha1",
  "version",
  "serial",
  "sig_alg",
  "pubkey_alg",
  "pubkey_bits",
  "ca",
  "pathlen",
  "key_usage",
  "ext_key_usage",
  "san",
  "ski",
  "aki",
  "self_signed",
] as const;

export const DN_KEY_MAP: Record<string, DnAttributeKey> = {
  cn: "cn",
  o: "o",
  ou: "ou",
  l: "l",
  st: "st",
  s: "st",
  c: "c",
  commonname: "cn",
  organization: "o",
  organizationalunitname: "ou",
  localityname: "l",
  stateorprovincename: "st",
  countryname: "c",
  emailaddress: "email",
  e: "email",
  dc: "dc",
  uid: "uid",
};

export const DN_LABELS: { key: DnAttributeKey; label: string }[] = [
  { key: "cn", label: "CN" },
  { key: "o", label: "组织" },
  { key: "ou", label: "部门" },
  { key: "l", label: "城市" },
  { key: "st", label: "州/省" },
  { key: "c", label: "国家" },
  { key: "email", label: "邮箱" },
  { key: "dc", label: "域组件" },
  { key: "uid", label: "UID" },
];

export const BUILTIN_BRAND_ICON = {
  [BuiltinCertKind.Reqable]: {
    label: "Reqable",
    src: "img/brands/reqable/app_icon.png",
    srcDark: "img/brands/reqable/ic_tray_normal.jpg",
  },
  [BuiltinCertKind.ProxyPin]: {
    label: "ProxyPin",
    src: "img/brands/proxypin/icon.png",
    srcDark: "img/brands/proxypin/icon_foreground.png",
    srcSmall: "img/brands/proxypin/icon-128.png",
  },
} as const;

export function resolveBrandIconSrc(
  kind: BuiltinCertKind,
  theme: ResolvedTheme,
  inline = false,
): string {
  const brand = BUILTIN_BRAND_ICON[kind];
  if (theme === ResolvedTheme.Dark && "srcDark" in brand && brand.srcDark) {
    return brand.srcDark;
  }
  if (inline && "srcSmall" in brand && brand.srcSmall) return brand.srcSmall;
  return brand.src;
}

export const BUILTIN_CERTS = [
  {
    kind: BuiltinCertKind.Reqable,
    fallbackTitle: BUILTIN_BRAND_ICON[BuiltinCertKind.Reqable].label,
    missingHint: "未检测到证书（请先在 App 中生成）",
  },
  {
    kind: BuiltinCertKind.ProxyPin,
    fallbackTitle: BUILTIN_BRAND_ICON[BuiltinCertKind.ProxyPin].label,
    missingHint: "未检测到证书",
  },
] as const;

export const HOT_MOUNT_ACTIONS = [
  { mode: HotMountMode.User, label: "用户证书", needsSdPath: false },
  { mode: HotMountMode.Sd, label: "存储卡", needsSdPath: true },
  { mode: HotMountMode.All, label: "合并挂载", needsSdPath: true },
] as const;

export const HOT_MODE_LABEL: Record<HotMountMode, string> = {
  [HotMountMode.User]: "用户证书",
  [HotMountMode.Sd]: "存储卡证书",
  [HotMountMode.All]: "用户 + 存储卡",
};

export const HOT_MOUNT_CONFIRM_LABEL: Record<HotMountMode, string> = {
  [HotMountMode.User]: "用户凭据区",
  [HotMountMode.Sd]: "存储卡目录",
  [HotMountMode.All]: "用户凭据区与存储卡目录",
};

export const HOT_MOUNT_META = "将用户区或存储卡 CA 临时并入系统信任库，重启后自动失效";

export function builtinStatusKeys(kind: BuiltinCertKind) {
  return {
    enabled: `${kind}_enabled`,
    active: `${kind}_active`,
    available: `${kind}_available`,
    display: `${kind}_display`,
    title: `${kind}_title`,
  } as const;
}
