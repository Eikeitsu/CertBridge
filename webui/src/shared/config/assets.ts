export const ASSETS = {
  icon: "img/icon.png",
  mark: "img/icon-mark.png",
  markLight: "img/icon-mark-light.png",
  tipQr: "assets/tip.png",
} as const;

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
