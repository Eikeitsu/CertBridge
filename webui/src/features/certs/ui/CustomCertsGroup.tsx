import { useAppSelector } from "@/app/store/hooks";
import { selectCustomCertificates } from "@/features/status/model/selectors";
import { CERT_IMPORT_ACCEPT } from "@/shared/config/certs";
import { NxButton, NxCard, NxEmpty, NxFilePick, NxSection } from "@/shared/ui";

type CustomCertsGroupProps = {
  onImport: (file: File) => void;
  onOpenDetail: (id: string, title: string) => void;
  onRemove: (name: string) => void;
};

export function CustomCertsGroup({
  onImport,
  onOpenDetail,
  onRemove,
}: CustomCertsGroupProps) {
  const customCertificates = useAppSelector(selectCustomCertificates);

  return (
    <NxSection
      eyebrow="Custom"
      title="自定义证书"
      action={
        <NxFilePick accept={CERT_IMPORT_ACCEPT.join(",")} onPick={onImport}>
          导入
        </NxFilePick>
      }
    >
      <p className="nx-section-note">PEM / DER / hash.0 · 校验 X.509、有效期与 CA:TRUE</p>
      {customCertificates.length === 0 ? (
        <NxCard>
          <NxEmpty>可导入 HttpCanary、ADGuard、Charles 等 CA</NxEmpty>
        </NxCard>
      ) : (
        customCertificates.map((cert) => (
          <article key={cert.name} className="nx-cert-card">
            <div className="nx-brand-icon" aria-hidden>
              <span className="nx-brand-fallback">CA</span>
            </div>
            <div className="nx-cert-card__body">
              <h3 className="nx-cert-card__title">{cert.display}</h3>
              <p className="nx-cert-card__sub">自定义 · {cert.name}</p>
            </div>
            <div className="nx-cert-card__actions">
              <NxButton
                variant="ghost"
                onClick={() => onOpenDetail(`custom:${cert.name}`, cert.display)}
              >
                详情
              </NxButton>
              <NxButton variant="ghost" tone="danger" onClick={() => onRemove(cert.name)}>
                移除
              </NxButton>
            </div>
          </article>
        ))
      )}
    </NxSection>
  );
}
