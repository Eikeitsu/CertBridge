import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";

/**
 * 进入日志页后再拉日志，避免首屏/切 Tab 时与 status 抢桥、卡在旧页。
 */
export function useEnsureActivityLog() {
  const dispatch = useAppDispatch();
  const { text, loading, lines } = useAppSelector(selectActivityLog);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (loading) return;
    // 已有真实内容则跳过；lines=0 且仍是占位时也再拉一次
    if (lines > 0 && text) {
      started.current = true;
      return;
    }
    started.current = true;
    void dispatch(fetchActivityLog());
  }, [dispatch, loading, lines, text]);
}
