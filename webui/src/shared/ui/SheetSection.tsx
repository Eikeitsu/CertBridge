import type { ReactNode } from "react";

type SheetSectionProps = {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
};

export function SheetSection({ title, extra, children }: SheetSectionProps) {
  return (
    <section className="bf-sheet__section">
      <h4>{title}</h4>
      {extra}
      {children}
    </section>
  );
}
