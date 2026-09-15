import type { ReactNode } from "react";
import { Loader } from "./Loader";

type PageSpinProps = {
  spinning?: boolean;
  label?: string;
  children: ReactNode;
};

export function PageSpin({ spinning, label, children }: PageSpinProps) {
  return (
    <div className="bf-spin">
      {children}
      {spinning ? (
        <div className="bf-spin__mask">
          <Loader label={label} />
        </div>
      ) : null}
    </div>
  );
}
