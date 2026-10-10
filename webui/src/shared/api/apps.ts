import { exec, getBridge } from "@/shared/api/ksu";
import { CLI_TIMEOUT_MS } from "@/shared/config/constants";

export type AppEntry = {
  package: string;
  name: string;
  iconUrl: string;
};

type PackageInfo = {
  packageName?: string;
  package?: string;
  appLabel?: string;
  name?: string;
  appName?: string;
  label?: string;
  error?: string;
};

/** KernelSU WebUI 图标协议 */
export function appIconUrl(packageName: string): string {
  return `ksu://icon/${packageName}`;
}

function pickLabel(info?: PackageInfo | null): string {
  if (!info || info.error) return "";
  return String(info.appLabel || info.appName || info.label || info.name || "").trim();
}

function pickPkg(info: PackageInfo): string {
  return String(info.packageName || info.package || "").trim();
}

function labelMapFromInfos(infos: PackageInfo[] | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(infos)) return map;
  for (const info of infos) {
    const pkg = pickPkg(info);
    const label = pickLabel(info);
    if (pkg && label && label !== pkg) map.set(pkg, label);
  }
  return map;
}

async function labelsFromDumpsys(pkgs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!pkgs.length) return map;
  try {
    const result = await exec(`dumpsys package 2>/dev/null`, 45_000);
    const want = new Set(pkgs);
    let pkg = "";
    for (const raw of result.stdout.split(/\r?\n/)) {
      const line = raw.trim();
      const m = line.match(/^Package\s*\[([^\]]+)\]/);
      if (m) {
        pkg = m[1] || "";
        continue;
      }
      if (!pkg || !want.has(pkg)) continue;
      const li = line.indexOf("applicationLabel=");
      if (li < 0) continue;
      const label = line.slice(li + "applicationLabel=".length).trim();
      if (label) map.set(pkg, label);
      pkg = "";
    }
  } catch {
    /* ignore */
  }
  return map;
}

function toEntries(pkgs: string[], labels: Map<string, string>): AppEntry[] {
  return pkgs.map((pkg) => ({
    package: pkg,
    name: labels.get(pkg) || pkg,
    iconUrl: appIconUrl(pkg),
  }));
}

/**
 * 列出已安装用户应用（优先管理器桥，失败则 pm list packages -3）。
 * 对齐充电控制游戏旁路 AppPicker 的数据源。
 */
export async function listInstalledApps(): Promise<AppEntry[]> {
  let pkgs: string[] = [];
  const bridge = getBridge() as
    | (ReturnType<typeof getBridge> & {
        listUserPackages?: () => string;
        listAllPackages?: () => string;
        getPackagesInfo?: (pkgsJson: string) => string;
      })
    | undefined;

  try {
    if (bridge?.listUserPackages) {
      pkgs = JSON.parse(bridge.listUserPackages() || "[]") as string[];
    } else if (bridge?.listAllPackages) {
      pkgs = JSON.parse(bridge.listAllPackages() || "[]") as string[];
    }
  } catch {
    pkgs = [];
  }

  if (!Array.isArray(pkgs) || !pkgs.length) {
    const result = await exec(
      `pm list packages -3 2>/dev/null | sed 's/^package://' | sort`,
      CLI_TIMEOUT_MS.IMPORT,
    );
    pkgs = result.stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  pkgs = [...new Set(pkgs.filter(Boolean))];
  if (!pkgs.length) return [];

  let labels = new Map<string, string>();
  try {
    if (bridge?.getPackagesInfo) {
      const chunk = 80;
      const infos: PackageInfo[] = [];
      for (let i = 0; i < pkgs.length; i += chunk) {
        const part = pkgs.slice(i, i + chunk);
        try {
          const raw = bridge.getPackagesInfo(JSON.stringify(part)) || "[]";
          const parsed = JSON.parse(raw) as PackageInfo[];
          if (Array.isArray(parsed)) infos.push(...parsed);
        } catch {
          /* continue */
        }
      }
      labels = labelMapFromInfos(infos);
    }
  } catch {
    /* fall through */
  }

  const missing = pkgs.filter((p) => !labels.has(p));
  if (missing.length) {
    const fromDump = await labelsFromDumpsys(missing);
    for (const [pkg, label] of fromDump) labels.set(pkg, label);
  }

  return toEntries(pkgs, labels);
}

/** 从名单文本提取包名（忽略空行与 # 注释） */
export function packagesFromListText(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/** 用勾选结果写回名单；保留原文顶部连续注释行 */
export function listTextFromPackages(pkgs: string[], previous = ""): string {
  const comments: string[] = [];
  for (const raw of previous.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t) {
      if (comments.length) break;
      continue;
    }
    if (t.startsWith("#")) comments.push(raw.replace(/\r$/, ""));
    else break;
  }
  const body = [...new Set(pkgs.map((p) => p.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const parts = [...comments];
  if (comments.length && body.length) parts.push("");
  parts.push(...body);
  if (!parts.length) return "";
  return `${parts.join("\n")}\n`;
}
