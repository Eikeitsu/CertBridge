import type { ExecResult } from "@/entities/module/types";
import { CLI_TIMEOUT_MS } from "@/shared/config/constants";
import { haptic, type HapticKind } from "@/shared/lib/haptic";
import { showSnack, type SnackTone } from "@/shared/lib/snack";

export function hasBridge(): boolean {
  return typeof ksu !== "undefined" && typeof ksu?.exec === "function";
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

    if (!hasBridge() || !ksu) {
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
      ksu.exec(cmd, "{}", cb);
    } catch (error) {
      try {
        ksu.exec(cmd, cb as unknown as string);
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
