import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TAB_PATH, isTabName } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";
import { haptic } from "@/shared/lib/haptic";

function resolveTabFromPath(pathname: string): TabName {
  if (pathname.startsWith(TAB_PATH[TabName.Certs])) return TabName.Certs;
  if (pathname.startsWith(TAB_PATH[TabName.Log])) return TabName.Log;
  if (pathname.startsWith(TAB_PATH[TabName.Hide])) return TabName.Hide;
  if (pathname.startsWith(TAB_PATH[TabName.More])) return TabName.More;
  return TabName.Home;
}

const ALL_TABS: TabName[] = [
  TabName.Home,
  TabName.Certs,
  TabName.Log,
  TabName.Hide,
  TabName.More,
];

/**
 * Tab 切换：乐观更新 activeTab（不等等路由），并管理懒挂载 seen。
 * 避免「点了还停在旧页、Loading 画在隐藏 pane 里」。
 */
export function useActiveTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeTab = resolveTabFromPath(location.pathname);
  const [optimisticTab, setOptimisticTab] = useState<TabName | null>(null);
  const activeTab = optimisticTab ?? routeTab;
  const [seen, setSeen] = useState<Partial<Record<TabName, boolean>>>(() => ({
    [routeTab]: true,
  }));

  useEffect(() => {
    if (optimisticTab != null && routeTab === optimisticTab) {
      setOptimisticTab(null);
    }
  }, [routeTab, optimisticTab]);

  useEffect(() => {
    setSeen((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  const switchTab = useCallback(
    (name: string) => {
      if (!isTabName(name) || name === activeTab) return;
      // 同一事件内批处理：立刻高亮 + 标 seen，再改 URL
      setSeen((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
      setOptimisticTab(name);
      haptic("light");
      navigate(TAB_PATH[name], { replace: true });
    },
    [activeTab, navigate],
  );

  /** 空闲时预热其它 Tab，让首次点击变成纯显示切换 */
  const prewarmTabs = useCallback(() => {
    setSeen((prev) => {
      const next = { ...prev };
      for (const tab of ALL_TABS) next[tab] = true;
      return next;
    });
  }, []);

  return {
    activeTab,
    pathname: location.pathname,
    switchTab,
    seen,
    prewarmTabs,
  };
}
