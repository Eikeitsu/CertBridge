import type { ReactNode } from "react";
import { FlagTone } from "@/entities/module/enums";

type FlagProps = {
  children: string;
  tone?: FlagTone;
};

export function Flag({ children, tone = FlagTone.Warn }: FlagProps) {
  const toneClass = tone === FlagTone.Info ? "info" : "warn";
  return <span className={`cb-flag tone-${toneClass}`}>{children}</span>;
}

type FlagListProps = {
  children: ReactNode;
  className?: string;
};

export function FlagList({ children, className }: FlagListProps) {
  return <div className={className || "cb-flag-list"}>{children}</div>;
}
