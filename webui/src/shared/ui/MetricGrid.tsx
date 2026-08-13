import { Grid } from "antd-mobile";

type Metric = { label: string; value: string | number };

type MetricGridProps = {
  items: Metric[];
};

export function MetricGrid({ items }: MetricGridProps) {
  return (
    <Grid columns={4} gap={8} className="cb-metrics">
      {items.map((item) => (
        <Grid.Item key={item.label}>
          <div className="cb-metric">
            <div className="value">{item.value}</div>
            <div className="label">{item.label}</div>
          </div>
        </Grid.Item>
      ))}
    </Grid>
  );
}
