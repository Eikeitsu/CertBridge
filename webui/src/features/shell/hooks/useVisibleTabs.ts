import { useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import {
  selectModuleStatus,
  selectStatusBootstrapped,
} from "@/features/status/model/selectors";
import { useShowHideTab } from "@/features/settings/hooks/useShowHideTab";
import { isFlagOn } from "@/shared/lib/flag";
import { TabName } from "@/entities/module/enums";
import { TABS } from "@/shared/config/navigation";

/**
 * 底栏 Tab：可由更多页开关隐藏「隐藏」页；默认显示，避免 4↔5 跳动取决于 status。
 */
export function useVisibleTabs() {
  const status = useAppSelector(selectModuleStatus);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const { showHideTab } = useShowHideTab();
  const hideSupported =
    isFlagOn(status.hide_supported) || isFlagOn(status.zn_hide_supported);

  const tabs = useMemo(() => {
    if (showHideTab) return TABS;
    return TABS.filter((tab) => tab.key !== TabName.Hide);
  }, [showHideTab]);

  return {
    tabs,
    hideSupported,
    showHideTab,
    hideReady: bootstrapped,
  };
}
