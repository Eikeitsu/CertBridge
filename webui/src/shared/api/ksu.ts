import type { ExecResult } from "@/entities/module/types";
import { CLI_TIMEOUT_MS } from "@/shared/config/constants";
import { haptic, type HapticKind } from "@/shared/lib/haptic";
import { showSnack, type SnackTone } from "@/shared/lib/snack";

type KsuBridge = {
  exec: (cmd: string, optsOrCb: string | object, cb?: string) => void;
  toast?: (msg: string) => void;
};

/**
 * SukiSU / KernelSU / MMRL 可能把桥挂在全局绑定或 window.* 上；
 * IIFE 里只写 `ksu` 在部分 WebView 会读不到，必须同时查 window。
 */
export function getBridge(): KsuBridge | undefined {
  const win = window as unknown as Window & Record<string, unknown>;
  const candidates: unknown[] = [
    typeof ksu !== "undefined" ? ksu : undefined,
    win.ksu,
    win.$ksu,
    win.$CertBridge,
    win.mmrl,
  ];
  for (const key of Object.keys(win)) {
    if (key.charAt(0) !== "$") continue;
    candidates.push(win[key]);
  }
  for (const api of candidates) {
    if (api && typeof (api as KsuBridge).exec === "function") {
      return api as KsuBridge;
    }
  }
  return undefined;
}

export function hasBridge(): boolean {
  return Boolean(getBridge());
}

export function exec(
  cmd: string,
  timeoutMs: number = CLI_TIMEOUT_MS.DEFAULT,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ExecResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timer = window.setTimeout(() => {
      finish({ errno: -2, stdout: "", stderr: "timeout" });
    }, timeoutMs);

    const bridge = getBridge();
    if (!bridge) {
      clearTimeout(timer);
      finish({ errno: -1, stdout: "", stderr: "no_bridge" });
      return;
    }

    const cb = `cb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const win = window as unknown as Window & Record<string, unknown>;
    win[cb] = (errno: number, stdout: string, stderr: string) => {
      clearTimeout(timer);
      delete win[cb];
      finish({
        errno: typeof errno === "number" ? errno : 0,
        stdout: stdout == null ? "" : String(stdout),
        stderr: stderr == null ? "" : String(stderr),
      });
    };

    try {
      bridge.exec(cmd, "{}", cb);
    } catch (error) {
      try {
        bridge.exec(cmd, cb as unknown as string);
      } catch (error2) {
        clearTimeout(timer);
        delete win[cb];
        finish({ errno: -1, stdout: "", stderr: String(error2 || error) });
      }
    }
  });
}

export function openUrl(url: string): Promise<ExecResult> {
  const safe = String(url || "").replace(/'/g, "");
  return exec(`am start -a android.intent.action.VIEW -d '${safe}' >/dev/null 2>&1`);
}

export function toast(message: string, tone: SnackTone = "info") {
  const kind: HapticKind = tone === "bad" ? "error" : tone === "ok" ? "success" : "light";
  haptic(kind);
  showSnack(message, tone);
}
