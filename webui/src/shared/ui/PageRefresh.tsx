import type { ReactNode } from "react";
import { PullToRefresh } from "antd-mobile";

type PageRefreshProps = {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
};

export function PageRefresh({ onRefresh, children }: PageRefreshProps) {
  return (
    <PullToRefresh
      onRefresh={async () => {
        await onRefresh();
      }}
    >
      {children}
    </PullToRefresh>
  );
}
