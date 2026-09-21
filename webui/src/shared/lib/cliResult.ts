import type { ExecResult } from "@/entities/module/types";

/** 合并 stdout/stderr：部分管理器会把契约行打到 stderr */
export function cliOutput(result: ExecResult): string {
  const out = result.stdout || "";
  const err = result.stderr || "";
  if (!err) return out;
  if (!out) return err;
  return `${out}\n${err}`;
}

/** 以契约为准：有 ok=1 即成功；有 error= 才失败；勿被 errno / stderr 误伤 */
export function isCliFailure(result: ExecResult): boolean {
  const out = cliOutput(result);
  if (/^ok=1\b/m.test(out)) return false;
  if (/^error=/m.test(out)) return true;
  return result.errno !== 0;
}
