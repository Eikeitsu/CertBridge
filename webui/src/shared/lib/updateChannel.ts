/** 更新通道：正式（Pages）/ CI（ci-dist 同分支清单+产物） */

import { exec } from "@/shared/api/ksu";
import { PATHS } from "@/shared/config/paths";
import { readStorage, writeStorage } from "@/shared/lib/storage";
import { STORAGE_KEYS } from "@/shared/config/paths";

export const UPDATE_CHANNELS = ["stable", "ci"] as const;
export type UpdateChannel = (typeof UPDATE_CHANNELS)[number];

export const UPDATE_CHANNEL_LABEL: Record<UpdateChannel, string> = {
  stable: "正式",
  ci: "CI",
};

export const UPDATE_CHANNEL_HINT: Record<UpdateChannel, string> = {
  stable: "推荐大多数用户；与管理器在线更新一致",
  ci: "开发构建，可能不稳定；清单与 zip 同在 ci-dist 分支",
};

const PAGES_UPDATE = "https://eikeitsu.github.io/CertBridge/update.json";
const CI_RAW_BASE =
  "https://raw.githubusercontent.com/Eikeitsu/CertBridge/ci-dist";
const CI_CDN_BASE = "https://cdn.jsdelivr.net/gh/Eikeitsu/CertBridge@ci-dist";

const PREFER_CDN_KEY = "cb_update_prefer_cdn";

export function parseUpdateChannel(
  raw: string | null | undefined,
): UpdateChannel {
  return raw === "ci" ? "ci" : "stable";
}

export function isPreferCdn(): boolean {
  return readStorage(PREFER_CDN_KEY) === "1";
}

export function setPreferCdn(on: boolean): void {
  writeStorage(PREFER_CDN_KEY, on ? "1" : "0");
}

export function channelUpdateJsonUrl(
  channel: UpdateChannel,
  preferCdn = isPreferCdn(),
): string {
  if (channel === "ci") {
    return preferCdn
      ? `${CI_CDN_BASE}/update.json`
      : `${CI_RAW_BASE}/update.json`;
  }
  return PAGES_UPDATE;
}

/** Rewrite raw.githubusercontent.com/.../ci-dist/... → jsDelivr when preferCdn */
export function toChannelAssetUrl(
  url: string,
  preferCdn = isPreferCdn(),
): string {
  const u = String(url || "").trim();
  if (!preferCdn || !u) return u;
  const m = u.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/ci-dist\/(.+)$/,
  );
  if (!m) return u;
  return `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@ci-dist/${m[3]}`;
}

export interface RemoteUpdateInfo {
  version: string;
  versionCode: number;
  zipUrl?: string;
  changelog?: string;
}

export interface ChannelCheckResult {
  channel: UpdateChannel;
  localVersion: string;
  localCode: number;
  remote: RemoteUpdateInfo | null;
  hasUpdate: boolean;
  /** 本地高于通道版本时仍可切回该通道包 */
  canSwitch: boolean;
  stableNewer: RemoteUpdateInfo | null;
  error: string | null;
}

export function versionLine(
  local?: string | null,
  remote?: string | null,
): string {
  const l = (local || "").trim() || "未知";
  const r = (remote || "").trim() || "--";
  return l === r ? l : `${l} → ${r}`;
}

async function readLocalModule(): Promise<{
  version: string;
  versionCode: number;
}> {
  const r = await exec(
    `grep -E '^(version|versionCode)=' '${PATHS.MODDIR}/module.prop' 2>/dev/null`,
    8_000,
  );
  let version = "";
  let versionCode = 0;
  for (const line of (r.stdout || "").split("\n")) {
    const v = line.match(/^version=(.*)$/);
    if (v) version = (v[1] || "").trim();
    const c = line.match(/^versionCode=(.*)$/);
    if (c) versionCode = Number((c[1] || "").trim()) || 0;
  }
  return { version, versionCode };
}

function parseJsonUpdate(text: string, preferCdn: boolean): RemoteUpdateInfo {
  const obj = JSON.parse(text) as Record<string, unknown>;
  return {
    version: String(obj.version ?? ""),
    versionCode: Number(obj.versionCode ?? 0),
    zipUrl: obj.zipUrl
      ? toChannelAssetUrl(String(obj.zipUrl), preferCdn)
      : undefined,
    changelog: obj.changelog ? String(obj.changelog) : undefined,
  };
}

async function fetchJsonUpdate(
  url: string,
  preferCdn: boolean,
): Promise<RemoteUpdateInfo> {
  const sep = url.includes("?") ? "&" : "?";
  const bust = `${url}${sep}_=${Date.now()}`;
  const resp = await fetch(bust, {
    cache: "no-store",
    headers: { "User-Agent": "CertBridge-WebUI" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return parseJsonUpdate(await resp.text(), preferCdn);
}

export async function checkUpdateChannel(
  channel: UpdateChannel,
  preferCdn = isPreferCdn(),
): Promise<ChannelCheckResult> {
  const local = await readLocalModule();
  let remote: RemoteUpdateInfo | null = null;
  let error: string | null = null;
  try {
    remote = await fetchJsonUpdate(
      channelUpdateJsonUrl(channel, preferCdn),
      preferCdn,
    );
  } catch (e) {
    if (channel === "ci" && preferCdn) {
      try {
        remote = await fetchJsonUpdate(
          channelUpdateJsonUrl(channel, false),
          false,
        );
      } catch (e2) {
        error = e2 instanceof Error ? e2.message : String(e2);
      }
    } else {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  let stableNewer: RemoteUpdateInfo | null = null;
  if (channel !== "stable") {
    try {
      const stable = await fetchJsonUpdate(
        channelUpdateJsonUrl("stable", false),
        false,
      );
      if (stable.versionCode > local.versionCode) stableNewer = stable;
    } catch {
      /* ignore */
    }
  }

  const remoteCode = remote?.versionCode ?? 0;
  return {
    channel,
    localVersion: local.version,
    localCode: local.versionCode,
    remote,
    hasUpdate: !!remote && remoteCode > local.versionCode,
    canSwitch: !!remote && remoteCode > 0 && remoteCode !== local.versionCode,
    stableNewer,
    error,
  };
}

export async function persistChannel(channel: UpdateChannel): Promise<void> {
  writeStorage(STORAGE_KEYS.updateChannel, channel);
  await exec(
    `mkdir -p '${PATHS.MODDIR}/data' && printf '%s\\n' '${channel}' > '${PATHS.MODDIR}/data/update_channel'`,
    5_000,
  );
}

export async function loadPersistedChannel(): Promise<UpdateChannel> {
  const fromLs = parseUpdateChannel(readStorage(STORAGE_KEYS.updateChannel));
  const r = await exec(
    `cat '${PATHS.MODDIR}/data/update_channel' 2>/dev/null`,
    5_000,
  );
  const fromFile = parseUpdateChannel((r.stdout || "").trim());
  if (fromFile === "ci" || fromFile === "stable") {
    writeStorage(STORAGE_KEYS.updateChannel, fromFile);
    return fromFile;
  }
  return fromLs;
}
