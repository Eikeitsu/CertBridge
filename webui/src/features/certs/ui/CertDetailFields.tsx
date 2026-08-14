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
    <div className="cb-sheet__fp-list">
      {fields.map((item) => (
        <button
          key={item.label}
          type="button"
          className="cb-sheet__fp"
          onClick={() => void copyText(item.copy || item.value, `已复制 ${item.label}`)}
        >
          <span className="cb-sheet__fp-label">{item.label}</span>
          <code>{item.value}</code>
          <span className="cb-sheet__fp-hint">点击复制</span>
        </button>
      ))}
    </div>
  );
}

type ValidityStripProps = {
  notBefore: string;
  notAfter: string;
  expired: boolean;
  daysLeft?: number;
  progress?: number;
};

export function CertValidityStrip({
  notBefore,
  notAfter,
  expired,
  daysLeft,
  progress,
}: ValidityStripProps) {
  const tone = expired ? "bad" : daysLeft != null && daysLeft <= 30 ? "warn" : "ok";

  return (
    <div className={`cb-sheet__validity-wrap tone-${tone}`}>
      <div className="cb-sheet__validity">
        <div>
          <span>起始</span>
          <strong>{notBefore}</strong>
        </div>
        <div className="cb-sheet__validity-arrow" aria-hidden />
        <div>
          <span>截止</span>
          <strong className={expired ? "is-bad" : undefined}>{notAfter}</strong>
        </div>
      </div>
      {progress != null ? (
        <div className="cb-sheet__validity-track" aria-hidden>
          <span
            className="cb-sheet__validity-fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
          <span
            className="cb-sheet__validity-pin"
            style={{ left: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
      {daysLeft != null ? (
        <p className="cb-sheet__validity-meta">
          {expired ? "证书已过期" : `剩余约 ${daysLeft} 天`}
        </p>
      ) : null}
    </div>
  );
}
