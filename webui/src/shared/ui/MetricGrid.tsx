type Metric = { label: string; value: string | number };

type MetricGridProps = {
  items: Metric[];
  columns?: 2 | 4;
};

export function MetricGrid({ items, columns = 4 }: MetricGridProps) {
  return (
    <div
      className={`cb-metrics is-cols-${columns}`}
      style={{ ["--cb-metrics-columns" as string]: columns }}
    >
      {items.map((item) => (
        <div key={item.label} className="cb-metric">
          <div className="value">{item.value}</div>
          <div className="label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
