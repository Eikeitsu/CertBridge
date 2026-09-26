import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { enrichFullStatus } from "@/features/status/model/statusSlice";
import {
  selectModuleStatus,
  selectStatusBootstrapped,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";

/**
 * 隐藏页挂载后再补全慢探测（kernel_umount 等），不挡切 Tab。
 */
export function useEnsureHideStatus() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const refreshing = useAppSelector(selectStatusRefreshing);
  const started = useRef(false);

  useEffect(() => {
    if (!bootstrapped || refreshing || started.current) return;
    // 非 quick 说明 enrichFull / refresh 已跑过
    if (status.status_quick && status.status_quick !== "1") {
      started.current = true;
      return;
    }
    started.current = true;
    void dispatch(enrichFullStatus());
  }, [bootstrapped, dispatch, refreshing, status.status_quick]);
}
