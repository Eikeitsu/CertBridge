import { toast } from "@/shared/api/ksu";

export function toastByRebootFlag(
  kv: Record<string, string>,
  whenRequired: string,
  whenCleared: string,
) {
  toast(
    kv.reboot_required === "1" ? whenRequired : whenCleared,
    kv.reboot_required === "1" ? "warn" : "ok",
  );
}
