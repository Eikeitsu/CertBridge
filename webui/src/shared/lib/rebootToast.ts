import { toast } from "@/shared/api/ksu";

export function toastByRebootFlag(
  kv: Record<string, string>,
  whenRequired: string,
  whenCleared: string,
) {
  // 无 reboot_required 契约时不要误报「已恢复」；交给后续 status 刷新
  if (!Object.prototype.hasOwnProperty.call(kv, "reboot_required")) return;
  toast(
    kv.reboot_required === "1" ? whenRequired : whenCleared,
    kv.reboot_required === "1" ? "warn" : "ok",
  );
}
