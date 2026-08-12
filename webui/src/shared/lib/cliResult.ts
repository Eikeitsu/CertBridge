import type { ExecResult } from "@/entities/module/types";

export function isCliFailure(result: ExecResult): boolean {
  return result.errno !== 0 || /error=/.test(result.stdout);
}
