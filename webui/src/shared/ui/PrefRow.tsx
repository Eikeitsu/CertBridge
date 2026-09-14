import type { ReactNode } from "react";
import { List } from "antd-mobile";

type PrefRowProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

export function PrefRow({ label, description, children }: PrefRowProps) {
  return (
    <List.Item extra={children} description={description}>
      {label}
    </List.Item>
  );
}
