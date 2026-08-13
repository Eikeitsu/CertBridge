import { Segmented as AdmSegmented } from "antd-mobile";

type SegmentedProps<T extends string> = {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <AdmSegmented
      block
      value={value}
      options={options}
      onChange={(next) => onChange(String(next) as T)}
    />
  );
}
