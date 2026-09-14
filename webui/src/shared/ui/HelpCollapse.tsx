import type { ReactNode } from "react";
import { Collapse } from "antd-mobile";

type HelpCollapseProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** 放在卡片内部时收成「内衬说明块」，不再自带卡片表面 */
  inset?: boolean;
};

export function HelpCollapse({
  title,
  children,
  defaultOpen = false,
  inset = false,
}: HelpCollapseProps) {
  return (
    <Collapse
      className={inset ? "cb-inset" : undefined}
      defaultActiveKey={defaultOpen ? ["help"] : []}
    >
      <Collapse.Panel key="help" title={title}>
        {children}
      </Collapse.Panel>
    </Collapse>
  );
}
