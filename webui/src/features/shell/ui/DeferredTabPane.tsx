import { useEffect, useState, type ReactNode } from "react";
import { Loader } from "@/shared/ui/Loader";

type DeferredTabPaneProps = {
  /** 当前是否为激活 Tab（控制 is-on / aria-hidden） */
  active: boolean;
  /** 是否已访问过（懒挂载门闩） */
  seen: boolean;
  className: string;
  children: ReactNode;
  /** 首次挂载前的占位文案 */
  loadingLabel?: string;
};

/**
 * 先切到空壳/Loading，等一帧绘制后再挂重页面，避免点 Tab 卡在旧页。
 */
export function DeferredTabPane({
  active,
  seen,
  className,
  children,
  loadingLabel,
}: DeferredTabPaneProps) {
  // 首屏已 seen 的 Tab（如首页）直接就绪，避免开屏闪 Loading
  const [ready, setReady] = useState(seen);

  useEffect(() => {
    if (!seen) {
      setReady(false);
      return;
    }
    if (ready) return;
    let cancelled = false;
    let id2 = 0;
    // 双 rAF：保证 dock / pane.is-on 先上屏，再挂 Hide/Log 重树
    const id1 = window.requestAnimationFrame(() => {
      id2 = window.requestAnimationFrame(() => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id1);
      if (id2) window.cancelAnimationFrame(id2);
    };
  }, [seen, ready]);

  return (
    <section className={`${className}${active ? " is-on" : ""}`} aria-hidden={!active}>
      {!seen ? null : ready ? (
        children
      ) : (
        <div className="bf-tab-pending" role="status">
          <Loader label={loadingLabel} />
        </div>
      )}
    </section>
  );
}
