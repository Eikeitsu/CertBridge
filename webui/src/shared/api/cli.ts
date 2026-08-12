import { PATHS } from "@/shared/config/paths";
import { exec } from "@/shared/api/ksu";
import { parseKv } from "@/shared/lib/parse";
import {
  CLI_TIMEOUT_MS,
  LOG_LINE_MAX,
  LOG_LINE_MIN,
  LOG_TAIL_LINES,
} from "@/shared/config/constants";
import type { FlagValue } from "@/shared/config/constants";
import type {
  BuiltinCertKind,
  CustomCertificate,
  ExecResult,
  HotMountMode,
  MountMode,
  ModuleStatus,
  TmpfsStyle,
} from "@/entities/module/types";

export async function cli(args: string, timeoutMs?: number): Promise<ExecResult> {
  return exec(`sh '${PATHS.CLI}' ${args}`, timeoutMs);
}

export async function fetchStatus(): Promise<ModuleStatus> {
  const result = await cli("status");
  if (result.errno !== 0 && !result.stdout) {
    throw new Error(result.stderr || "status_failed");
  }
  return parseKv(result.stdout) as ModuleStatus;
}

export async function listCustom(): Promise<CustomCertificate[]> {
  const result = await cli("list_custom");
  const rows: CustomCertificate[] = [];
  for (const line of String(result.stdout || "").split("\n")) {
    if (!line.startsWith("custom|")) continue;
    const parts = line.split("|");
    if (parts.length < 3) continue;
    rows.push({ name: parts[1], display: parts.slice(2).join("|") || parts[1] });
  }
  return rows;
}

export async function toggleBuiltin(kind: BuiltinCertKind, value: FlagValue) {
  return cli(`toggle ${kind} ${value}`);
}

export async function syncAppSources(): Promise<{
  updated: number;
  kept: number;
  miss: number;
  rebootRequired: boolean;
}> {
  const result = await cli("sync_apps", CLI_TIMEOUT_MS.IMPORT);
  const kv = parseKv(result.stdout || "");
  return {
    updated: Number(kv.updated || 0),
    kept: Number(kv.kept || 0),
    miss: Number(kv.miss || 0),
    rebootRequired: kv.reboot_required === "1" || Number(kv.updated || 0) > 0,
  };
}

export async function setMountMode(mode: MountMode) {
  return cli(`set_mount_mode ${mode}`);
}

export async function setTmpfsStyle(style: TmpfsStyle) {
  return cli(`set_tmpfs_style ${style}`);
}

export async function installCustom(payload: string) {
  return cli(`install_custom '${payload}'`, CLI_TIMEOUT_MS.IMPORT);
}

export async function removeCustom(fileName: string) {
  return cli(`remove_custom '${fileName.replace(/'/g, "")}'`);
}

export async function certInfo(target: string) {
  return cli(`cert_info '${target.replace(/'/g, "")}'`);
}

export async function hotMount(mode: HotMountMode, sdPath?: string) {
  const extra = sdPath ? ` '${sdPath.replace(/'/g, "")}'` : "";
  return cli(`hot_mount ${mode}${extra}`, CLI_TIMEOUT_MS.HOT_MOUNT);
}

export async function hotUnmount() {
  return cli("hot_unmount", CLI_TIMEOUT_MS.HOT_MOUNT);
}

export async function readLog(
  lineCount = LOG_TAIL_LINES,
): Promise<{ text: string; bytes: number }> {
  const safeCount = Math.max(LOG_LINE_MIN, Math.min(LOG_LINE_MAX, lineCount));
  const result = await exec(
    `{ wc -c < '${PATHS.LOG}' 2>/dev/null; echo '---'; tail -n ${safeCount} '${PATHS.LOG}' 2>/dev/null; } || true`,
  );
  const rawOutput = result.stdout || "";
  const separatorIndex = rawOutput.indexOf("---");
  const byteHead =
    separatorIndex >= 0 ? rawOutput.slice(0, separatorIndex) : "";
  const text =
    separatorIndex >= 0
      ? rawOutput.slice(separatorIndex + 3).replace(/^\r?\n/, "")
      : rawOutput;
  const bytes =
    Number(String(byteHead).trim().split(/\s+/)[0] || 0) || 0;
  return { text, bytes };
}

export async function clearLog() {
  return exec(`: > '${PATHS.LOG}'`);
}

export async function rebootDevice() {
  return exec("svc power reboot || reboot");
}

export async function fetchDeviceLabel(): Promise<string> {
  const result = await exec(
    "getprop ro.product.marketname; getprop ro.product.model; getprop ro.build.version.release; getprop ro.mi.os.version.name",
  );
  if (
    result.errno === -1 &&
    /no_bridge|no_ksu_bridge/.test(result.stderr || "")
  ) {
    return "未检测到 WebUI 桥接";
  }
  const lines = String(result.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const deviceName = lines[0] || lines[1] || "本机";
  const androidRelease = lines[2] ? `Android ${lines[2]}` : "";
  const hyperOsLabel = lines[3]
    ? ` · ${lines[3]}`
    : androidRelease
      ? ` · ${androidRelease}`
      : "";
  return `${deviceName}${hyperOsLabel || (androidRelease ? ` · ${androidRelease}` : "")}`;
}
