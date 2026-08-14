import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/shared/config/paths";

export function useLogLevelFilter(): [string, (value: string) => void] {
  const [level, setLevel] = useState("");

  useEffect(() => {
    try {
      setLevel(localStorage.getItem(STORAGE_KEYS.logLevelFilter) || "");
    } catch {
      setLevel("");
    }
  }, []);

  const update = (value: string) => {
    setLevel(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEYS.logLevelFilter, value);
      else localStorage.removeItem(STORAGE_KEYS.logLevelFilter);
    } catch {
      /* localStorage 不可用时仅内存态 */
    }
  };

  return [level, update];
}
