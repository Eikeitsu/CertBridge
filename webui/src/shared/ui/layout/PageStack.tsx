import type { ReactNode } from "react";

type PageStackProps = {
  children: ReactNode;
  className?: string;
};

export function PageStack({ children, className }: PageStackProps) {
  return (
    <div className={["bf-stack", className].filter(Boolean).join(" ")}>{children}</div>
  );
}
