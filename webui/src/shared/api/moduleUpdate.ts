/** WebUI：下载模块 zip → 无人值守 CLI 刷入（失败再打开管理器）。 */
import { exec } from "./ksu";
import { PATHS } from "@/shared/config/paths";
import { toChannelAssetUrl } from "@/shared/lib/updateChannel";
import i18n from "@/shared/i18n";

export interface LocalModuleInfo {
  version: string;
  versionCode: number;
}

export type ModuleUpdatePhase = "download" | "write" | "install" | "manager";

export type ModuleUpdateProgress = {
  phase: ModuleUpdatePhase;
  /** 0–100；写盘/安装阶段可逐步推进 */
  percent: number;
  detail?: string;
};

export type ModuleUpdateProgressFn = (p: ModuleUpdateProgress) => void;

const INSTALL_AUTO = "/data/adb/certbridge/install_auto";
const EXT_DIR = "/data/adb/certbridge";

const MANAGER_PACKAGES = [
  "com.rifsxd.ksunext",
  "me.weishu.kernelsu",
  "com.tiann.kernelsu",
  "com.topjohnwu.magisk",
  "io.github.vvb2060.magisk",
  "me.bmax.apatch",
  "com.sukisu.ultra",
] as const;

const INSTALL_TIMEOUT_MS = 300_000;

export async function readLocalModule(): Promise<LocalModuleInfo | null> {
  const r = await exec(
    `grep -E '^(version|versionCode)=' '${PATHS.MODDIR}/module.prop' 2>/dev/null`,
    8_000,
  );
  if (r.errno !== 0 && !r.stdout) return null;
  let version = "";
  let versionCode = 0;
  for (const line of (r.stdout || "").split("\n")) {
    const v = line.match(/^version=(.*)$/);
    if (v) version = (v[1] || "").trim();
    const c = line.match(/^versionCode=(.*)$/);
    if (c) versionCode = Number((c[1] || "").trim()) || 0;
  }
  if (!version && !versionCode) return null;
  return { version, versionCode };
}

function shellQuote(s: string): string {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function writeBinaryFile(
  dest: string,
  data: ArrayBuffer,
  onProgress?: ModuleUpdateProgressFn,
): Promise<boolean> {
  const bytes = new Uint8Array(data);
  const dir = dest.replace(/\/[^/]+$/, "");
  const init = await exec(`mkdir -p '${dir}' && : > '${dest}' && echo ok`, 10_000);
  if (!(init.stdout || "").includes("ok")) return false;
  const chunk = 18 * 1024;
  const total = Math.max(1, bytes.length);
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    let bin = "";
    for (let j = 0; j < slice.length; j++) bin += String.fromCharCode(slice[j]!);
    const b64 = btoa(bin);
    const r = await exec(`echo '${b64}' | base64 -d >> '${dest}'`, 60_000);
    if (r.errno === -1) return false;
    const written = Math.min(i + slice.length, total);
    onProgress?.({
      phase: "write",
      percent: clampPercent(55 + (written / total) * 25),
      detail: `${written}/${total}`,
    });
  }
  const check = await exec(`[ -s '${dest}' ] && echo ok`, 5_000);
  return (check.stdout || "").includes("ok");
}

async function fetchToBuffer(
  url: string,
  onProgress?: ModuleUpdateProgressFn,
): Promise<ArrayBuffer | null> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "CertBridge-WebUI" },
  });
  if (!resp.ok) return null;

  const total = Number(resp.headers.get("content-length")) || 0;
  if (!resp.body || typeof resp.body.getReader !== "function") {
    const buf = await resp.arrayBuffer();
    onProgress?.({
      phase: "download",
      percent: buf.byteLength > 0 ? 55 : 0,
      detail: `bytes=${buf.byteLength}`,
    });
    return buf.byteLength > 0 ? buf : null;
  }

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) {
      chunks.push(value);
      received += value.length;
      const pct =
        total > 0 ? (received / total) * 55 : Math.min(50, 8 + received / 200_000);
      onProgress?.({
        phase: "download",
        percent: clampPercent(pct),
        detail: total > 0 ? `${received}/${total}` : `bytes=${received}`,
      });
    }
  }
  if (received <= 0) return null;
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  onProgress?.({ phase: "download", percent: 55, detail: `bytes=${received}` });
  return out.buffer;
}

async function downloadZip(
  url: string,
  zip: string,
  onProgress?: ModuleUpdateProgressFn,
): Promise<{ ok: boolean; detail: string }> {
  const u = shellQuote(url);
  const z = shellQuote(zip);
  const dir = zip.replace(/\/[^/]+$/, "");

  onProgress?.({ phase: "download", percent: 2, detail: "start" });

  try {
    const buf = await fetchToBuffer(url, onProgress);
    if (buf && buf.byteLength > 0 && (await writeBinaryFile(zip, buf, onProgress))) {
      onProgress?.({
        phase: "write",
        percent: 82,
        detail: `webview bytes=${buf.byteLength}`,
      });
      return { ok: true, detail: `webview bytes=${buf.byteLength}` };
    }
  } catch {
    /* curl fallback */
  }

  onProgress?.({ phase: "download", percent: 12, detail: "curl" });
  const script = [
    `mkdir -p '${dir}'`,
    `rm -f ${z}`,
    `OK=0`,
    `(command -v curl >/dev/null && curl -fsSL --connect-timeout 15 --max-time 180 -o ${z} ${u} && OK=1) || true`,
    `[ "$OK" = 1 ] || (command -v wget >/dev/null && wget -q -O ${z} ${u} && OK=1) || true`,
    `[ "$OK" = 1 ] && [ -s ${z} ] || { echo error=download_failed; exit 0; }`,
    `echo downloaded=1`,
  ].join("\n");
  const r = await exec(script, 240_000);
  const out = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
  if (/error=download_failed/.test(out) || !/downloaded=1/.test(out)) {
    return { ok: false, detail: out };
  }
  onProgress?.({ phase: "download", percent: 82, detail: out });
  return { ok: true, detail: out };
}

async function installModuleCli(zip: string): Promise<{ ok: boolean; detail: string }> {
  const path = zip.replace(/'/g, "");
  const attempts = [
    `magisk --install-module '${path}'`,
    `ksud module install '${path}'`,
    `/data/adb/ksud module install '${path}'`,
    `nsenter --mount=/proc/1/ns/mnt -- /data/adb/ksud module install '${path}'`,
    `nsenter --mount=/proc/1/ns/mnt -- /data/adb/magisk/magisk --install-module '${path}'`,
    `/data/adb/ap/bin/apd module install '${path}'`,
    `nsenter --mount=/proc/1/ns/mnt -- /data/adb/ap/bin/apd module install '${path}'`,
  ];
  const logs: string[] = [];
  for (const cmd of attempts) {
    logs.push(`$ ${cmd}`);
    const r = await exec(cmd, INSTALL_TIMEOUT_MS);
    const out = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
    if (out) logs.push(out);
    logs.push(`# exit=${r.errno}`);
    if (
      r.errno === 0 ||
      /\bSuccess\b/i.test(out) ||
      /installed successfully/i.test(out)
    ) {
      return { ok: true, detail: logs.join("\n") };
    }
  }
  return { ok: false, detail: logs.join("\n") };
}

async function openZipInManager(zip: string): Promise<{ ok: boolean; detail: string }> {
  const z = shellQuote(zip);
  const pkgs = MANAGER_PACKAGES.map((p) => shellQuote(p)).join(" ");
  const script = [
    `chmod 0644 ${z} 2>/dev/null || true`,
    `URI="file://${zip}"`,
    `LAUNCHED=0`,
    `for pkg in ${pkgs}; do`,
    `  pm path "$pkg" >/dev/null 2>&1 || continue`,
    `  am start -a android.intent.action.VIEW -d "$URI" -t application/zip -p "$pkg" >/dev/null 2>&1 && LAUNCHED=1 && echo manager=$pkg && break`,
    `done`,
    `if [ "$LAUNCHED" != 1 ]; then`,
    `  am start -a android.intent.action.VIEW -d "$URI" -t application/zip >/dev/null 2>&1 && LAUNCHED=1`,
    `fi`,
    `[ "$LAUNCHED" = 1 ] && echo ok=1 || echo error=open_manager_failed`,
    `echo zip=${zip}`,
  ].join("\n");
  const r = await exec(script, 30_000);
  const out = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
  return { ok: /\bok=1\b/.test(out), detail: out };
}

export type ModuleInstallMode = "cli" | "manager" | "";

export async function downloadAndInstallModule(
  zipUrl: string,
  onProgress?: ModuleUpdateProgressFn,
): Promise<{
  ok: boolean;
  error: string;
  detail: string;
  zipPath: string;
  mode: ModuleInstallMode;
}> {
  const url = toChannelAssetUrl(String(zipUrl || "").trim());
  const zipPath = "/data/local/tmp/CertBridge_update.zip";
  if (!url) {
    return {
      ok: false,
      error: i18n.t("update.errors.missingUrl", { ns: "webui" }),
      detail: "",
      zipPath,
      mode: "",
    };
  }

  const dl = await downloadZip(url, zipPath, onProgress);
  if (!dl.ok) {
    return {
      ok: false,
      error: i18n.t("update.errors.downloadFailed", { ns: "webui" }),
      detail: dl.detail,
      zipPath,
      mode: "",
    };
  }

  onProgress?.({ phase: "install", percent: 88, detail: "cli" });
  await exec(`mkdir -p '${EXT_DIR}' && touch '${INSTALL_AUTO}'`, 5_000);
  const cli = await installModuleCli(zipPath);
  await exec(`rm -f '${INSTALL_AUTO}'; rmdir '${EXT_DIR}' 2>/dev/null || true`, 5_000);

  if (cli.ok) {
    onProgress?.({ phase: "install", percent: 100, detail: "done" });
    return { ok: true, error: "", detail: cli.detail, zipPath, mode: "cli" };
  }

  onProgress?.({ phase: "manager", percent: 94, detail: "open" });
  const mgr = await openZipInManager(zipPath);
  if (mgr.ok) {
    onProgress?.({ phase: "manager", percent: 100, detail: "opened" });
    return {
      ok: true,
      error: "",
      detail: `${cli.detail}\n---\n${mgr.detail}`,
      zipPath,
      mode: "manager",
    };
  }

  return {
    ok: false,
    error: i18n.t("update.errors.installFailed", { ns: "webui" }),
    detail: `${cli.detail}\n---\n${mgr.detail}`,
    zipPath,
    mode: "",
  };
}
