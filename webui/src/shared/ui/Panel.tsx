import type { ReactNode } from "react";
import { Card } from "antd-mobile";

type PanelProps = {
  title?: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, meta, action, children, className }: PanelProps) {
  return (
    <Card
      title={title}
      extra={action}
      className={`cb-panel${className ? ` ${className}` : ""}`}
    >
      {meta ? <p className="cb-panel__meta">{meta}</p> : null}
      {children}
    </Card>
  );
}
