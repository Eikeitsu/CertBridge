import { isFlagOn } from "@/shared/lib/flag";

export const DEFAULT_STATUS_DESC =
  "安全合并 Reqable / ProxyPin / 自定义 CA，并支持用户区、存储卡证书免重启挂载与无痕卸载。";

export function resolveApexLabel(apexOk?: string): string {
  if (apexOk === "2") return "N/A";
  if (apexOk === "1") return "已注入";
  return "失败";
}

export function resolveHotLabel(status: {
  hot_supported?: string;
  hot_stale?: string;
  hot_active?: string;
  hot_partial?: string;
}): string {
  if (!isFlagOn(status.hot_supported)) return "N/A";
  if (isFlagOn(status.hot_stale)) return "异常";
  if (isFlagOn(status.hot_active)) {
    return isFlagOn(status.hot_partial) ? "部分" : "已挂载";
  }
  return "未挂载";
}
