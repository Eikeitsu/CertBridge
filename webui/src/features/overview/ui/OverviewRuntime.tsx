import { ThemePack } from "@/entities/module/enums";
import { SectionLabel } from "@/shared/ui";

type RuntimeItem = { label: string; value: string };

type OverviewRuntimeProps = {
  pack: ThemePack;
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
  pack,
  title,
  androidLabel,
  rootLabel,
  apexLabel,
  mountModeLabel,
  versionLabel,
  hotStatusLabel,
  lastRefreshedAt,
}: OverviewRuntimeProps) {
  const items: RuntimeItem[] = [
    { label: "Android", value: androidLabel },
    { label: "Root", value: rootLabel },
    { label: "APEX", value: apexLabel },
    { label: "挂载", value: mountModeLabel },
    { label: "版本", value: versionLabel },
    { label: "热挂载", value: hotStatusLabel },
  ];

  return (
    <section className="cb-runtime-block">
      <SectionLabel>{title}</SectionLabel>
      <p className="cb-list-group__meta">最近刷新 · {lastRefreshedAt}</p>
      <div className={`cb-runtime is-${pack}`}>
        {items.map((item) => (
          <div key={item.label} className="cb-runtime__item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
