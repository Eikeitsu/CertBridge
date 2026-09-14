import { List } from "antd-mobile";

type DetailItem = { label: string; value: string };

type DetailGridProps = {
  items: DetailItem[];
};

export function DetailGrid({ items }: DetailGridProps) {
  return (
    <List>
      {items.map((item) => (
        <List.Item key={item.label} extra={item.value}>
          {item.label}
        </List.Item>
      ))}
    </List>
  );
}
