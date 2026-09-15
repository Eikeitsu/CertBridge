import { copyText } from "@/shared/lib/copyText";

type CopyFieldProps = {
  label: string;
  value: string;
  copy?: string;
  mono?: boolean;
};

export function CopyField({ label, value, copy, mono }: CopyFieldProps) {
  return (
    <button
      type="button"
      className={mono ? "bf-sheet__cell is-mono" : "bf-sheet__cell"}
      onClick={() => void copyText(copy || value, `已复制${label}`)}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}
