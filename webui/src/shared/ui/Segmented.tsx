import { Segmented as AdmSegmented } from "antd-mobile";

type SegmentedProps<T extends string> = {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: SegmentedProps<T>) {
  return (
    <div className={disabled ? "cb-seg is-busy" : "cb-seg"}>
      <AdmSegmented
        block
        value={value}
        options={options}
        onChange={(next) => {
          if (disabled) return;
          onChange(String(next) as T);
        }}
      />
    </div>
  );
}
