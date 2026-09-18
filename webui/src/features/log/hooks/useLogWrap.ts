import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/shared/config/paths";

/** 日志是否自动折行；默认开启（与现有表现一致） */
export function useLogWrap(): [boolean, (value: boolean) => void] {
  const [wrap, setWrap] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.logWrap);
      if (raw === "0") setWrap(false);
      else if (raw === "1") setWrap(true);
    } catch {
      setWrap(true);
    }
  }, []);

  const update = (value: boolean) => {
    setWrap(value);
    try {
      localStorage.setItem(STORAGE_KEYS.logWrap, value ? "1" : "0");
    } catch {
      /* localStorage 不可用时仅内存态 */
    }
  };

  return [wrap, update];
}
