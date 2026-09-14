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
      className={mono ? "cb-sheet__cell is-mono" : "cb-sheet__cell"}
      onClick={() => void copyText(copy || value, `已复制${label}`)}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}
