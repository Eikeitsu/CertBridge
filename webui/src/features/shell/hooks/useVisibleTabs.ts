import { useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { TabName } from "@/entities/module/enums";
import { TABS } from "@/shared/config/navigation";

/** 按模块已安装组件过滤底部 Tab（隐藏页仅在安装了 hide_assist 时出现） */
export function useVisibleTabs() {
  const status = useAppSelector(selectModuleStatus);
  const hideSupported = isFlagOn(status.hide_supported);

  const tabs = useMemo(() => {
    return hideSupported ? TABS : TABS.filter((tab) => tab.key !== TabName.Hide);
  }, [hideSupported]);

  return { tabs, hideSupported };
}
