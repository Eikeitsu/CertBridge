import { copyText } from "@/shared/lib/copyText";
import { DN_LABELS } from "@/shared/config/certs";
import type { CertDn } from "../lib/types";

type CertDnBlockProps = {
  title?: string;
  dn: CertDn;
  embedded?: boolean;
};

export function CertDnContent({ dn }: { dn: CertDn }) {
  const rows = [
    ...DN_LABELS.filter((item) => dn[item.key]).map((item) => ({
      label: item.label,
      value: dn[item.key] as string,
    })),
    ...dn.extras,
  ];

  return (
    <>
      {rows.length ? (
        <div className="nx-detail-grid">
          {rows.map((row) => (
            <button
              key={`${row.label}-${row.value}`}
              type="button"
              className="nx-detail-cell"
              onClick={() => void copyText(row.value, `已复制${row.label}`)}
            >
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </button>
          ))}
        </div>
      ) : null}
      {dn.raw ? (
        <button
          type="button"
          className="nx-detail-mono"
          onClick={() => void copyText(dn.raw, "已复制完整 DN")}
        >
          {dn.raw}
        </button>
      ) : (
        <p className="nx-section-note">未解析到此项</p>
      )}
    </>
  );
}

export function CertDnBlock({ title, dn, embedded }: CertDnBlockProps) {
  if (embedded) return <CertDnContent dn={dn} />;
  return (
    <section className="nx-detail-section">
      {title ? (
        <header className="nx-detail-section__head">
          <h4>{title}</h4>
        </header>
      ) : null}
      <CertDnContent dn={dn} />
    </section>
  );
}
