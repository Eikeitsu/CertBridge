import { copyText } from "@/shared/lib/copyText";
import { CopyField } from "@/shared/ui";
import type { DetailField } from "../lib/types";

type FieldGridProps = {
  fields: DetailField[];
};

export function CertFieldGrid({ fields }: FieldGridProps) {
  if (!fields.length) return null;
  return (
    <div className="cb-sheet__grid">
      {fields.map((item) => (
        <CopyField
          key={item.label}
          label={item.label}
          value={item.value}
          copy={item.copy}
          mono={item.mono}
        />
      ))}
    </div>
  );
}

type FingerprintListProps = {
  fields: DetailField[];
};

export function CertFingerprintList({ fields }: FingerprintListProps) {
  if (!fields.length) return null;
  return (
    <>
      {fields.map((item) => (
        <button
          key={item.label}
          type="button"
          className="cb-sheet__fp"
          onClick={() => void copyText(item.copy || item.value, `已复制 ${item.label}`)}
        >
          <span>{item.label}</span>
          <code>{item.value}</code>
        </button>
      ))}
    </>
  );
}

type ValidityStripProps = {
  notBefore: string;
  notAfter: string;
  expired: boolean;
};

export function CertValidityStrip({ notBefore, notAfter, expired }: ValidityStripProps) {
  return (
    <div className="cb-sheet__validity">
      <div>
        <span>起始</span>
        <strong>{notBefore}</strong>
      </div>
      <div className="cb-sheet__validity-arrow" />
      <div>
        <span>截止</span>
        <strong className={expired ? "is-bad" : undefined}>{notAfter}</strong>
      </div>
    </div>
  );
}
