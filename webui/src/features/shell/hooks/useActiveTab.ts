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

/**
 * 乐观切 Tab + 按需挂载（不预热）。
 * 未挂载的目标页：先切过去并显示壳层 Loading，下一帧再挂重树。
 */
export function useActiveTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeTab = resolveTabFromPath(location.pathname);
  const [optimisticTab, setOptimisticTab] = useState<TabName | null>(null);
  const activeTab = optimisticTab ?? routeTab;
  const [mounted, setMounted] = useState<Partial<Record<TabName, boolean>>>(() => ({
    [routeTab]: true,
  }));

  useEffect(() => {
    if (optimisticTab != null && routeTab === optimisticTab) {
      setOptimisticTab(null);
    }
  }, [routeTab, optimisticTab]);

  // 当前 Tab 尚未挂载：等浏览器画出 Loading 后再 mount（禁止预热抢主线程）
  useEffect(() => {
    if (mounted[activeTab]) return;
    let cancelled = false;
    let id2 = 0;
    const id1 = window.requestAnimationFrame(() => {
      id2 = window.requestAnimationFrame(() => {
        if (!cancelled) {
          setMounted((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
        }
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id1);
      if (id2) window.cancelAnimationFrame(id2);
    };
  }, [activeTab, mounted]);

  const switchTab = useCallback(
    (name: TabName | string) => {
      if (!isTabName(name) || name === activeTab) return;
      setOptimisticTab(name);
      haptic("light");
      navigate(TAB_PATH[name], { replace: true });
    },
    [activeTab, navigate],
  );

  return {
    activeTab,
    pathname: location.pathname,
    switchTab,
    /** @deprecated 用 mounted */
    seen: mounted,
    mounted,
    /** 当前可见 Tab 还在等挂载 → 壳层应盖 Loading */
    tabPending: !mounted[activeTab],
    prewarmTabs: () => {
      /* 已废弃：预热会堵死首次点击 */
    },
  };
}
