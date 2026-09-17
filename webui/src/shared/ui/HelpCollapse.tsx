import type { ReactNode } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type HelpCollapseProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  inset?: boolean;
};

export function HelpCollapse({
  title,
  children,
  defaultOpen = false,
  inset = false,
}: HelpCollapseProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={`bf-collapse${inset ? " is-inset" : ""}`}
    >
      <Collapsible.Trigger
        className="bf-collapse__trigger"
        data-state={open ? "open" : "closed"}
      >
        <span>{title}</span>
        <ChevronDown className="bf-collapse__chevron" size={18} aria-hidden />
      </Collapsible.Trigger>
      <Collapsible.Content className="bf-collapse__content">
        <div className="bf-collapse__body">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
