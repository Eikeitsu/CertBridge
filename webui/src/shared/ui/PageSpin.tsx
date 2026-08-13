import type { ReactNode } from "react";
import { SpinLoading } from "antd-mobile";

type PageSpinProps = {
  spinning?: boolean;
  children: ReactNode;
};

export function PageSpin({ spinning, children }: PageSpinProps) {
  return (
    <div className="cb-spin">
      {children}
      {spinning ? (
        <div className="cb-spin__mask">
          <SpinLoading color="primary" />
        </div>
      ) : null}
    </div>
  );
}
