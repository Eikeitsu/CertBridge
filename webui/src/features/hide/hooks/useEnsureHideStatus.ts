import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { enrichFullStatus } from "@/features/status/model/statusSlice";
import {
  selectModuleStatus,
  selectStatusBootstrapped,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { TAB_PATH } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";

/**
 * 仅在「隐藏」页可见时补全慢探测；离开即 abort。
 * 完整 status 走后台落盘轮询，避免占住 WebUI 桥导致切 Tab 卡住。
 */
export function useEnsureHideStatus() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const onHide = location.pathname.startsWith(TAB_PATH[TabName.Hide]);
  const status = useAppSelector(selectModuleStatus);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const refreshing = useAppSelector(selectStatusRefreshing);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!onHide) return;
    if (!bootstrapped || refreshing || doneRef.current) return;
    if (status.status_quick && status.status_quick !== "1") {
      doneRef.current = true;
      return;
    }

    let aborted = false;
    let abortFn: (() => void) | null = null;
    const t = window.setTimeout(() => {
      if (aborted) return;
      const request = dispatch(enrichFullStatus());
      abortFn = () => request.abort();
      void Promise.resolve(request).then((action) => {
        if (enrichFullStatus.fulfilled.match(action) && action.payload.status) {
          doneRef.current = true;
        }
      });
    }, 500);

    return () => {
      aborted = true;
      window.clearTimeout(t);
      abortFn?.();
    };
  }, [onHide, bootstrapped, dispatch, refreshing, status.status_quick]);
}
