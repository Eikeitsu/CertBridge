import { useEffect } from "react";
import { useAppDispatch } from "@/app/store/hooks";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { TrustTone } from "@/entities/module/enums";

/** 首页信任标题是否处于「尚未落稳」文案（会触发轻量/延后复核） */
export function isStabilizingTrustTitle(title: string): boolean {
  if (!title) return false;
  return (
    /稳定中|注入中|检测中|启动中|Stable|Inject|Check|Boot|Pending/i.test(title) ||
    title.includes("\u2728") ||
    title.includes("\u{1F50D}")
  );
}

/**
 * 信任态仍在稳定/检测时：先普通 status，再延后一次 --live。
 * 避免一进首页就跑 check_store_injected（重）。
 */
export function useStabilizingRefresh(
  bootstrapped: boolean,
  trustTitle: string,
  trustTone: TrustTone,
) {
  const dispatch = useAppDispatch();
  const stabilizing = trustTone === TrustTone.Idle && isStabilizingTrustTitle(trustTitle);

  useEffect(() => {
    if (!bootstrapped || !stabilizing) return;
    const soft = window.setTimeout(() => {
      void dispatch(refreshStatus({ toast: false, syncApps: false, live: false }));
    }, 4000);
    const live = window.setTimeout(() => {
      void dispatch(refreshStatus({ toast: false, syncApps: false, live: true }));
    }, 14000);
    return () => {
      window.clearTimeout(soft);
      window.clearTimeout(live);
    };
  }, [bootstrapped, stabilizing, dispatch]);
}
