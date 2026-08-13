import type { ReactNode } from "react";

type FieldLabelProps = {
  children: ReactNode;
};

export function FieldLabel({ children }: FieldLabelProps) {
  return <div className="cb-field-label">{children}</div>;
}

type StackProps = {
  children: ReactNode;
};

export function Stack({ children }: StackProps) {
  return <div className="cb-stack">{children}</div>;
}
