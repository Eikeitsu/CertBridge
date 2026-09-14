import { Space, Tag } from "antd-mobile";

type ChipListProps = {
  items: string[];
};

export function ChipList({ items }: ChipListProps) {
  return (
    <Space wrap>
      {items.map((item) => (
        <Tag key={item} color="primary" fill="outline" round>
          {item}
        </Tag>
      ))}
    </Space>
  );
}
