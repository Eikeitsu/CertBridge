import type { ReactNode } from "react";

type PageStackProps = {
  children: ReactNode;
  className?: string;
};

export function PageStack({ children, className }: PageStackProps) {
  return (
    <div className={["cb-stack", className].filter(Boolean).join(" ")}>{children}</div>
  );
}
