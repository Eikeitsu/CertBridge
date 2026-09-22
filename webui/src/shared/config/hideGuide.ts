export const HIDE_GUIDE_SECTION_IDS = [
  "capture",
  "magisk",
  "ksu",
  "apatch",
  "limits",
] as const;

export type HideGuideSectionId = (typeof HIDE_GUIDE_SECTION_IDS)[number];
