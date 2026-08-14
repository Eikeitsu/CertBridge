import type { ReactNode } from "react";
import { List } from "antd-mobile";

type ListGroupProps = {
  title?: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
};

/** 微信 / iOS 设置式分组：灰底分区标题 + 白卡片列表 */
export function ListGroup({ title, meta, action, children }: ListGroupProps) {
  return (
    <div className="cb-list-group">
      {title || action ? (
        <div className="cb-list-group__head">
          {title ? (
            <p className="cb-section-label cb-list-group__label">{title}</p>
          ) : null}
          {action ? <div className="cb-list-group__action">{action}</div> : null}
        </div>
      ) : null}
      {meta ? <p className="cb-list-group__meta">{meta}</p> : null}
      <List mode="card">{children}</List>
    </div>
  );
}

type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  flags?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  clickable?: boolean;
};

export function ListRow({
  leading,
  title,
  subtitle,
  flags,
  actions,
  onClick,
  clickable,
}: ListRowProps) {
  return (
    <List.Item
      prefix={leading}
      extra={actions}
      clickable={clickable || Boolean(onClick)}
      arrowIcon={clickable || Boolean(onClick) ? true : undefined}
      onClick={onClick}
      description={
        subtitle || flags ? (
          <div className="cb-list-row__meta">
            {subtitle ? <span className="cb-list-row__sub">{subtitle}</span> : null}
            {flags}
          </div>
        ) : undefined
      }
    >
      {title}
    </List.Item>
  );
}
