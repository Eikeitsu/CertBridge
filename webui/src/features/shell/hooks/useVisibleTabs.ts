import { useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { TabName } from "@/entities/module/enums";
import { TABS } from "@/shared/config/navigation";

/** 按模块已安装组件过滤底部 Tab（SuSFS 隐藏协助或 Zygisk 过滤任一安装即显示） */
export function useVisibleTabs() {
  const status = useAppSelector(selectModuleStatus);
  const hideSupported =
    isFlagOn(status.hide_supported) || isFlagOn(status.zn_hide_supported);

  const tabs = useMemo(() => {
    return hideSupported ? TABS : TABS.filter((tab) => tab.key !== TabName.Hide);
  }, [hideSupported]);

  return { tabs, hideSupported };
}
