import type { ReactNode } from "react";
import { Loader } from "@/shared/ui/Loader";

type TabPaneProps = {
  active: boolean;
  /** 是否已挂载页面树（未挂载时不渲染 children） */
  mounted: boolean;
  className: string;
  children: ReactNode;
};

/** 纯显示切换；挂载由外壳控制，Loading 由 TabPendingOverlay 统一盖在 main 上 */
export function TabPane({ active, mounted, className, children }: TabPaneProps) {
  return (
    <section className={`${className}${active ? " is-on" : ""}`} aria-hidden={!active}>
      {mounted ? children : null}
    </section>
  );
}

type TabPendingOverlayProps = {
  show: boolean;
  label?: string;
};

/** 盖在 main 上的 Loading，与 pane 显隐无关，保证用户一定看得见 */
export function TabPendingOverlay({ show, label }: TabPendingOverlayProps) {
  if (!show) return null;
  return (
    <div className="bf-tab-overlay" role="status" aria-live="polite">
      <Loader label={label} />
    </div>
  );
}
