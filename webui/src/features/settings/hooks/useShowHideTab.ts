import { useCallback, useSyncExternalStore } from "react";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { readStorage, writeStorage } from "@/shared/lib/storage";

const LISTENERS = new Set<() => void>();

function emit() {
  for (const listener of LISTENERS) listener();
}

function readShowHideTab(): boolean {
  const raw = readStorage(STORAGE_KEYS.showHideTab);
  // 默认显示；仅显式关闭时隐藏
  return raw !== FLAG_OFF;
}

export function getShowHideTab() {
  return readShowHideTab();
}

export function setShowHideTab(next: boolean) {
  writeStorage(STORAGE_KEYS.showHideTab, next ? FLAG_ON : FLAG_OFF);
  emit();
}

export function subscribeShowHideTab(listener: () => void) {
  LISTENERS.add(listener);
  return () => LISTENERS.delete(listener);
}

/** 更多页开关：是否在底栏显示「隐藏」Tab */
export function useShowHideTab() {
  const show = useSyncExternalStore(subscribeShowHideTab, getShowHideTab, () => true);
  const setShow = useCallback((next: boolean) => {
    setShowHideTab(next);
  }, []);
  return { showHideTab: show, setShowHideTab: setShow };
}
