export type HapticKind = "light" | "medium" | "success" | "error";

const PATTERN: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 16,
  success: [8, 32, 12],
  error: [18, 36, 18],
};

export function haptic(kind: HapticKind = "light") {
  try {
    const vibrate = navigator.vibrate?.bind(navigator);
    if (!vibrate) return;
    vibrate(PATTERN[kind]);
  } catch {
    /* WebView 可能禁用震动 */
  }
}
