import { useState } from "react";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export type MoreView = "hub" | "appearance" | "mount";

/** 三套 pack More 页共用的导航状态 */
export function useMorePageModel() {
  const chrome = usePackChrome();
  const { voice } = usePackVoice();
  const m = voice.more;
  const v = chrome.more;
  const [view, setView] = useState<MoreView>("hub");
  return { chrome, voice, m, v, view, setView };
}
