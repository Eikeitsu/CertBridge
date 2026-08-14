import { DetailGrid, HelpCollapse } from "@/shared/ui";

type OverviewRuntimeProps = {
  title: string;
  androidLabel: string;
  rootLabel: string;
  apexLabel: string;
  mountModeLabel: string;
  versionLabel: string;
  hotStatusLabel: string;
  lastRefreshedAt: string;
};

export function OverviewRuntime({
  title,
  androidLabel,
  rootLabel,
  apexLabel,
  mountModeLabel,
  versionLabel,
  hotStatusLabel,
  lastRefreshedAt,
}: OverviewRuntimeProps) {
  return (
    <HelpCollapse title={title}>
      <DetailGrid
        items={[
          { label: "Android", value: androidLabel },
          { label: "Root", value: rootLabel },
          { label: "APEX", value: apexLabel },
          { label: "挂载", value: mountModeLabel },
          { label: "版本", value: versionLabel },
          { label: "热挂载", value: hotStatusLabel },
        ]}
      />
      <p className="cb-muted" style={{ marginTop: 12 }}>
        最近刷新 · {lastRefreshedAt}
      </p>
    </HelpCollapse>
  );
}
