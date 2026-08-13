import { List } from "antd-mobile";

type KvItem = { label: string; value: string };

type KvListProps = {
  items: KvItem[];
};

export function KvList({ items }: KvListProps) {
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
