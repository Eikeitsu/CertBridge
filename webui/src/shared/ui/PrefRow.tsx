import type { ReactNode } from "react";
import { List } from "antd-mobile";

type PrefRowProps = {
  label: string;
  children: ReactNode;
};

export function PrefRow({ label, children }: PrefRowProps) {
  return <List.Item extra={children}>{label}</List.Item>;
}
