/** 简易颜色工具：系统栏取色 / 亮度 */

export function normalizeHex(input: string, fallback = "#F4F7F6"): string {
  let hex = String(input || "").trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : fallback;
}

export function relativeLuminanceHex(hex: string): number {
  const h = normalizeHex(hex).slice(1);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = f(parseInt(h.slice(0, 2), 16));
  const g = f(parseInt(h.slice(2, 4), 16));
  const b = f(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 把 getComputedStyle 得到的 rgb/hex 转成 #RRGGBB */
export function cssColorToHex(color: string, fallback: string): string {
  const raw = String(color || "").trim();
  if (!raw) return normalizeHex(fallback);
  if (raw.startsWith("#")) return normalizeHex(raw, fallback);
  const match = raw.match(/rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)/i);
  if (!match) return normalizeHex(fallback);
  const toHex = (v: string) =>
    Math.max(0, Math.min(255, Math.round(Number(v))))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`.toUpperCase();
}

export function relativeLuminanceCss(color: string): number {
  return relativeLuminanceHex(cssColorToHex(color, "#808080"));
}
