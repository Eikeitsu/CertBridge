import type { ReactNode } from "react";
import { FlagTone } from "@/entities/module/enums";

type FlagProps = {
  children: string;
  tone?: FlagTone;
};

export function Flag({ children, tone = FlagTone.Warn }: FlagProps) {
  return <span className={`bf-flag tone-${tone}`}>{children}</span>;
}

type FlagListProps = {
  children: ReactNode;
  className?: string;
};

export function FlagList({ children, className }: FlagListProps) {
  return <div className={className || "bf-flag-list"}>{children}</div>;
}
