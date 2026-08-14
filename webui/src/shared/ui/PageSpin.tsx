import type { ReactNode } from "react";
import { Loader } from "./Loader";

type PageSpinProps = {
  spinning?: boolean;
  label?: string;
  children: ReactNode;
};

export function PageSpin({ spinning, label, children }: PageSpinProps) {
  return (
    <div className="cb-spin">
      {children}
      {spinning ? (
        <div className="cb-spin__mask">
          <Loader label={label} />
        </div>
      ) : null}
    </div>
  );
}
