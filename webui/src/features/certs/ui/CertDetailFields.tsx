import { copyText } from "@/shared/lib/copyText";
import type { DetailField } from "../lib/types";

function CopyCell({
  label,
  value,
  copy,
  mono,
}: {
  label: string;
  value: string;
  copy?: string;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      className={`nx-detail-cell${mono ? " is-mono" : ""}`}
      onClick={() => void copyText(copy || value, `已复制${label}`)}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

export function CertFieldGrid({ fields }: { fields: DetailField[] }) {
  if (!fields.length) return null;
  return (
    <div className="nx-detail-grid">
      {fields.map((item) => (
        <CopyCell
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

export function CertFingerprintList({ fields }: { fields: DetailField[] }) {
  if (!fields.length) return null;
  return (
    <div className="nx-detail-fp-list">
      {fields.map((item) => (
        <button
          key={item.label}
          type="button"
          className="nx-detail-fp"
          onClick={() => void copyText(item.copy || item.value, `已复制 ${item.label}`)}
        >
          <span className="nx-detail-fp__label">{item.label}</span>
          <code>{item.value}</code>
          <span className="nx-detail-fp__hint">点击复制</span>
        </button>
      ))}
    </div>
  );
}

export function CertValidityStrip({
  notBefore,
  notAfter,
  expired,
  daysLeft,
  progress,
}: {
  notBefore: string;
  notAfter: string;
  expired: boolean;
  daysLeft?: number;
  progress?: number;
}) {
  const tone = expired ? "bad" : daysLeft != null && daysLeft <= 30 ? "warn" : "ok";

  return (
    <div className={`nx-detail-validity tone-${tone}`}>
      <div className="nx-detail-validity__row">
        <div>
          <span>起始</span>
          <strong>{notBefore}</strong>
        </div>
        <div className="nx-detail-validity__arrow" aria-hidden>
          →
        </div>
        <div>
          <span>截止</span>
          <strong className={expired ? "is-bad" : undefined}>{notAfter}</strong>
        </div>
      </div>
      {progress != null ? (
        <div className="nx-detail-validity__track" aria-hidden>
          <span
            className="nx-detail-validity__fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
      {daysLeft != null ? (
        <p className="nx-detail-validity__meta">
          {expired ? "证书已过期" : `剩余约 ${daysLeft} 天`}
        </p>
      ) : null}
    </div>
  );
}
