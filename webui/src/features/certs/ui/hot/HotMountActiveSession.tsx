import type { ModuleStatus } from "@/entities/module/types";
import { HOT_MOUNT_ACTIVE_META } from "@/shared/config/certs";
import { MetricGrid } from "@/shared/ui/layout";
import { Button, Tag } from "@/shared/ui/primitives";

type HotMountActiveSessionProps = {
  status: ModuleStatus;
  isPartial: boolean;
  disabled?: boolean;
  onUnmount: () => void;
};

export function HotMountActiveSession({
  status,
  isPartial,
  disabled,
  onUnmount,
}: HotMountActiveSessionProps) {
  return (
    <>
      <p style={{ fontSize: "0.8rem", color: "var(--cb-ink-3)", margin: "8px 0" }}>
        {HOT_MOUNT_ACTIVE_META}
      </p>
      <MetricGrid
        columns={2}
        items={[
          { label: "已加入", value: status.hot_added || "0" },
          { label: "命名空间", value: status.hot_namespaces || "0" },
        ]}
      />
      <div className="cb-btn-row" style={{ marginTop: 12 }}>
        {isPartial ? <Tag tone="warn">部分未覆盖</Tag> : null}
        <Button disabled={disabled} onClick={onUnmount}>
          无痕卸载
        </Button>
      </div>
    </>
  );
}
