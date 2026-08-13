import type { ReactNode } from "react";
import { List } from "antd-mobile";

type LinkRowProps = {
  label: ReactNode;
  onClick: () => void;
};

export function LinkRow({ label, onClick }: LinkRowProps) {
  return (
    <List.Item clickable arrowIcon onClick={onClick}>
      <span className="cb-brand-link">{label}</span>
    </List.Item>
  );
}
