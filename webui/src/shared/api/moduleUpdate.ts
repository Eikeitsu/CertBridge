/** WebUI：下载模块 zip → 无人值守 CLI 刷入（失败再打开管理器）。 */
import { exec } from "./ksu";
import { PATHS } from "@/shared/config/paths";
import { toChannelAssetUrl } from "@/shared/lib/updateChannel";

export interface LocalModuleInfo {
  version: string;
  versionCode: number;
}

const INSTALL_AUTO = "/data/adb/certbridge/install_auto";

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

async function writeBinaryFile(dest: string, data: ArrayBuffer): Promise<boolean> {
  const bytes = new Uint8Array(data);
  const dir = dest.replace(/\/[^/]+$/, "");
  const init = await exec(`mkdir -p '${dir}' && : > '${dest}' && echo ok`, 10_000);
  if (!(init.stdout || "").includes("ok")) return false;
  const chunk = 18 * 1024;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    let bin = "";
    for (let j = 0; j < slice.length; j++) bin += String.fromCharCode(slice[j]!);
    const b64 = btoa(bin);
    const r = await exec(`echo '${b64}' | base64 -d >> '${dest}'`, 60_000);
    if (r.errno === -1) return false;
  }
  const check = await exec(`[ -s '${dest}' ] && echo ok`, 5_000);
  return (check.stdout || "").includes("ok");
}

async function downloadZip(
  url: string,
  zip: string,
): Promise<{ ok: boolean; detail: string }> {
  const u = shellQuote(url);
  const z = shellQuote(zip);
  const dir = zip.replace(/\/[^/]+$/, "");

  try {
    const resp = await fetch(url, { headers: { "User-Agent": "CertBridge-WebUI" } });
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      if (buf.byteLength > 0 && (await writeBinaryFile(zip, buf))) {
        return { ok: true, detail: `webview bytes=${buf.byteLength}` };
      }
    }
  } catch {
    /* curl fallback */
  }

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

export async function downloadAndInstallModule(zipUrl: string): Promise<{
  ok: boolean;
  error: string;
  detail: string;
  zipPath: string;
  mode: ModuleInstallMode;
}> {
  const url = toChannelAssetUrl(String(zipUrl || "").trim());
  const zipPath = "/data/local/tmp/CertBridge_update.zip";
  if (!url) {
    return { ok: false, error: "缺少下载地址", detail: "", zipPath, mode: "" };
  }

  const dl = await downloadZip(url, zipPath);
  if (!dl.ok) {
    return { ok: false, error: "下载失败", detail: dl.detail, zipPath, mode: "" };
  }

  await exec(`mkdir -p /data/adb/certbridge && touch '${INSTALL_AUTO}'`, 5_000);
  const cli = await installModuleCli(zipPath);
  await exec(`rm -f '${INSTALL_AUTO}'`, 5_000);

  if (cli.ok) {
    return { ok: true, error: "", detail: cli.detail, zipPath, mode: "cli" };
  }

  const mgr = await openZipInManager(zipPath);
  if (mgr.ok) {
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
    error: "安装失败：CLI 与打开管理器均未成功",
    detail: `${cli.detail}\n---\n${mgr.detail}`,
    zipPath,
    mode: "",
  };
}
