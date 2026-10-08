/** 两级 Root：能判出 L2 只显示分支，否则显示 L1 大类 */
export function formatRootLabel(family?: string, flavor?: string, empty = "—"): string {
  const fam = (family || "").trim();
  if (!fam) return empty;
  const flv = (flavor || "").trim();
  if (flv && flv !== "official") return flv;
  return fam;
}
