import type { Experimental14System } from "@/entities/module/enums";
import {
  EXPERIMENTAL_14_SYSTEM_FOOTNOTE,
  EXPERIMENTAL_14_SYSTEM_OPTIONS,
} from "@/shared/config/mount";
import { Card, Segment } from "@/shared/ui/primitives";

type Experimental14SystemPanelProps = {
  mode: Experimental14System;
  pending?: boolean;
  onChange: (mode: Experimental14System) => void;
  dense?: boolean;
  surface?: "card" | "plain";
};

export function Experimental14SystemPanel({
  mode,
  pending,
  onChange,
  dense,
  surface = "card",
}: Experimental14SystemPanelProps) {
  return (
    <Card
      title="Android 14+ system 路径"
      meta={EXPERIMENTAL_14_SYSTEM_FOOTNOTE}
      surface={surface}
      className={dense ? "bf-card--dense" : undefined}
    >
      <Segment
        value={mode}
        disabled={pending}
        options={EXPERIMENTAL_14_SYSTEM_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.meta,
        }))}
        onChange={(value) => onChange(value as Experimental14System)}
      />
    </Card>
  );
}
