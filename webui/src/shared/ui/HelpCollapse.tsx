import type { ReactNode } from "react";
import { Collapse } from "antd-mobile";

type HelpCollapseProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function HelpCollapse({
  title,
  children,
  defaultOpen = false,
}: HelpCollapseProps) {
  return (
    <Collapse defaultActiveKey={defaultOpen ? ["help"] : []}>
      <Collapse.Panel key="help" title={title}>
        {children}
      </Collapse.Panel>
    </Collapse>
  );
}
