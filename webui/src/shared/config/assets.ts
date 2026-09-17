export const ASSETS = {
  icon: "img/icon.png",
  mark: "img/icon-mark.png",
  markLight: "img/icon-mark-light.png",
  tipWechat: "assets/tip-wechat.png",
  tipAlipay: "assets/tip-alipay.jpg",
} as const;

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
