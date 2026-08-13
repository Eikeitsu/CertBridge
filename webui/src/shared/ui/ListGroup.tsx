import type { ReactNode } from "react";
import { List } from "antd-mobile";

type ListGroupProps = {
  title: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function ListGroup({ title, meta, action, children }: ListGroupProps) {
  return (
    <List
      mode="card"
      header={
        <div className="cb-adm-list-head">
          <div>
            <div>{title}</div>
            {meta ? <p className="cb-adm-list-meta">{meta}</p> : null}
          </div>
          {action}
        </div>
      }
    >
      {children}
    </List>
  );
}

type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function ListRow({ leading, title, subtitle, actions }: ListRowProps) {
  return (
    <List.Item prefix={leading} extra={actions} description={subtitle}>
      {title}
    </List.Item>
  );
}
