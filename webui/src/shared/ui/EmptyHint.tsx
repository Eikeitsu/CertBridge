import { Empty } from "antd-mobile";

type EmptyHintProps = {
  children: string;
};

export function EmptyHint({ children }: EmptyHintProps) {
  return <Empty description={children} />;
}
