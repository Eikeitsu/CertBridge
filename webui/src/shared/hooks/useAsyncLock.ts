import { useCallback, useRef, useState } from "react";

/**
 * 串行异步锁：同一时间只跑一个任务，避免重复提交。
 */
export function useAsyncLock() {
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  const runExclusive = useCallback(async <T>(task: () => Promise<T>) => {
    if (pendingRef.current) return undefined;
    pendingRef.current = true;
    setIsPending(true);
    try {
      return await task();
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, []);

  return { isPending, runExclusive };
}
