import { useLocation, useNavigate } from "react-router-dom";
import { TAB_PATH, isTabName } from "@/shared/config/navigation";
import type { TabName } from "@/entities/module/types";

function resolveTabFromPath(pathname: string): TabName {
  if (pathname.startsWith("/certs")) return "certs";
  if (pathname.startsWith("/log")) return "log";
  if (pathname.startsWith("/more")) return "more";
  return "home";
}

export function useActiveTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = resolveTabFromPath(location.pathname);

  const switchTab = (name: string) => {
    if (!isTabName(name) || name === activeTab) return;
    // replace：Tab 不入历史栈，侧滑/虚拟返回可直接退出 WebUI
    navigate(TAB_PATH[name], { replace: true });
  };

  return { activeTab, pathname: location.pathname, switchTab };
}
