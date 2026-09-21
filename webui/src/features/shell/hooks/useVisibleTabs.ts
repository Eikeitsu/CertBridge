import { useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus, selectStatusBootstrapped } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { TABS } from "@/shared/config/navigation";

/**
 * 底部 Tab 始终 5 项（含隐藏），避免 status 回来后 4→5 突兀跳动。
 * hideSupported 仅供页面内展示「未安装隐藏组件」等状态。
 */
export function useVisibleTabs() {
  const status = useAppSelector(selectModuleStatus);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const hideSupported =
    isFlagOn(status.hide_supported) || isFlagOn(status.zn_hide_supported);

  const tabs = useMemo(() => TABS, []);

  return {
    tabs,
    hideSupported,
    /** 尚未 bootstrap 时不要把隐藏页当成「不支持」 */
    hideReady: bootstrapped,
  };
}
