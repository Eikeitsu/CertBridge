import { useEffect, useState, type ReactNode } from "react";
import { Loader } from "@/shared/ui/Loader";

type DeferredTabPaneProps = {
  active: boolean;
  seen: boolean;
  className: string;
  children: ReactNode;
  loadingLabel?: string;
};

function scheduleIdle(fn: () => void, timeoutMs: number): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => fn(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, Math.min(400, timeoutMs));
  return () => window.clearTimeout(id);
}

/**
 * 可见时：先画出 Loading，再挂重树。
 * 不可见但已 seen（预热）：idle 时在后台挂载，不挡当前交互。
 */
export function DeferredTabPane({
  active,
  seen,
  className,
  children,
  loadingLabel,
}: DeferredTabPaneProps) {
  // 首屏当前 Tab 直接挂载，避免开屏闪 Loading
  const [mounted, setMounted] = useState(() => seen && active);

  useEffect(() => {
    if (!seen) {
      setMounted(false);
      return;
    }
    if (mounted) return;

    if (active) {
      let cancelled = false;
      let id2 = 0;
      let cancelIdle: (() => void) | undefined;
      // 双 rAF：先让 is-on + Loading 上屏，再挂重页面
      const id1 = window.requestAnimationFrame(() => {
        id2 = window.requestAnimationFrame(() => {
          cancelIdle = scheduleIdle(() => {
            if (!cancelled) setMounted(true);
          }, 120);
        });
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(id1);
        if (id2) window.cancelAnimationFrame(id2);
        cancelIdle?.();
      };
    }

    // 预热：后台挂载
    return scheduleIdle(() => setMounted(true), 2500);
  }, [seen, active, mounted]);

  const showLoader = Boolean(seen && active && !mounted);

  return (
    <section className={`${className}${active ? " is-on" : ""}`} aria-hidden={!active}>
      {!seen ? null : mounted ? (
        children
      ) : showLoader ? (
        <div className="bf-tab-pending" role="status">
          <Loader label={loadingLabel} />
        </div>
      ) : null}
    </section>
  );
}
