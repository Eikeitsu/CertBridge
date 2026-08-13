import type { ReactNode } from "react";
import { Space, Tag } from "antd-mobile";
import { FlagTone } from "@/entities/module/enums";

type FlagProps = {
  children: string;
  tone?: FlagTone;
};

export function Flag({ children, tone = FlagTone.Warn }: FlagProps) {
  return (
    <Tag color={tone === FlagTone.Info ? "primary" : "warning"} fill="outline" round>
      {children}
    </Tag>
  );
}

type FlagListProps = {
  children: ReactNode;
  className?: string;
};

export function FlagList({ children, className = "cb-stage__flags" }: FlagListProps) {
  return (
    <Space className={className} wrap>
      {children}
    </Space>
  );
}
