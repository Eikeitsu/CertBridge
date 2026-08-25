import type { CSSProperties, ReactNode } from "react";

export type MetricItem = {
  label: string;
  value: ReactNode;
};

type MetricGridProps = {
  items: MetricItem[];
  columns?: number;
  className?: string;
  style?: CSSProperties;
};

export function MetricGrid({ items, columns, className, style }: MetricGridProps) {
  const gridStyle: CSSProperties = {
    ...(columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : {}),
    ...style,
  };

  return (
    <div className={["cb-metrics", className].filter(Boolean).join(" ")} style={gridStyle}>
      {items.map((item) => (
        <div key={item.label} className="cb-metric">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
