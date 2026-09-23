import { useTranslation } from "react-i18next";
import type { ModuleStatus } from "@/entities/module/types";
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
  const { t } = useTranslation("webui");

  return (
    <>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--bf-ink-3)",
          margin: "8px 0",
        }}
      >
        {t("certs.hotActiveMeta")}
      </p>
      <MetricGrid
        columns={2}
        items={[
          { label: t("certs.hotMetricAdded"), value: status.hot_added || "0" },
          { label: t("certs.hotMetricNamespaces"), value: status.hot_namespaces || "0" },
        ]}
      />
      <div className="bf-btn-row" style={{ marginTop: 12 }}>
        {isPartial ? <Tag tone="warn">{t("certs.hotPartialTag")}</Tag> : null}
        <Button disabled={disabled} onClick={onUnmount}>
          {t("certs.hotSilentUnmount")}
        </Button>
      </div>
    </>
  );
}
