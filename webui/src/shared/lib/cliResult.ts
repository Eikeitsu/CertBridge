import type { ExecResult } from "@/entities/module/types";

/** 以 stdout 契约为准：有 ok=1 即成功；有 error= 才失败；勿被 errno 误伤 */
export function isCliFailure(result: ExecResult): boolean {
  const out = result.stdout || "";
  if (/^ok=1\b/m.test(out)) return false;
  if (/^error=/m.test(out)) return true;
  return result.errno !== 0;
}
