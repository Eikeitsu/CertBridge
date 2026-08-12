import { useEffect, useState } from "react";
import { DEFAULT_SD_CERT_DIR } from "@/shared/config/constants";
import { STORAGE_KEYS } from "@/shared/config/paths";
import type { HotMountMode } from "@/entities/module/types";

function readStoredSdPath(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.hotSdPath) || DEFAULT_SD_CERT_DIR;
  } catch {
    return DEFAULT_SD_CERT_DIR;
  }
}

export function useHotMountPanel() {
  const [mode, setMode] = useState<HotMountMode>("user");
  const [sdPath, setSdPath] = useState(readStoredSdPath);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.hotSdPath, sdPath);
    } catch {
      /* ignore quota / private mode */
    }
  }, [sdPath]);

  return {
    mode,
    setMode,
    sdPath,
    setSdPath,
  };
}
