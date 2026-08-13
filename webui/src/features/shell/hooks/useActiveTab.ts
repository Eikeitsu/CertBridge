import { useLocation, useNavigate } from "react-router-dom";
import { TAB_PATH, isTabName } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";

function resolveTabFromPath(pathname: string): TabName {
  if (pathname.startsWith(TAB_PATH[TabName.Certs])) return TabName.Certs;
  if (pathname.startsWith(TAB_PATH[TabName.Log])) return TabName.Log;
  if (pathname.startsWith(TAB_PATH[TabName.More])) return TabName.More;
  return TabName.Home;
}

export function useActiveTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = resolveTabFromPath(location.pathname);

  const switchTab = (name: string) => {
    if (!isTabName(name) || name === activeTab) return;
    navigate(TAB_PATH[name], { replace: true });
  };

  return { activeTab, pathname: location.pathname, switchTab };
}
