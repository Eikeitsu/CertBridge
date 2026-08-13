import { toast } from "@/shared/api/ksu";

export async function copyText(value: string, okMessage = "已复制") {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast(okMessage);
  } catch {
    toast("复制失败");
  }
}
