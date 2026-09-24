import i18n from "@/shared/i18n";
import { toast } from "@/shared/api/ksu";

export async function copyText(value: string, okMessage?: string) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast(okMessage || i18n.t("ui.copyOk"), "ok");
  } catch {
    toast(i18n.t("ui.copyFail"), "bad");
  }
}
