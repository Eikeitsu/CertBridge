import type { ReactNode } from "react";
import type { BuiltinCertKind } from "@/entities/module/enums";
import { Tag } from "@/shared/ui/primitives";
import type { FormattedCertDetail } from "../lib/types";
import { CertBrandIcon } from "./CertBrandIcon";
import { CertDnBlock } from "./CertDnBlock";
import {
  CertFieldGrid,
  CertFingerprintList,
  CertValidityStrip,
} from "./CertDetailFields";

type CertDetailBodyProps = {
  detail: FormattedCertDetail;
  brandKind?: BuiltinCertKind;
};

function DetailSection({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="nx-detail-section">
      <header className="nx-detail-section__head">
        <h4>{title}</h4>
        {extra}
      </header>
      {children}
    </section>
  );
}

export function CertDetailBody({ detail, brandKind }: CertDetailBodyProps) {
  return (
    <>
      <header className="nx-detail-hero">
        <div
          className={`nx-detail-hero__mark${brandKind ? " has-brand" : ""}`}
          aria-hidden
        >
          {brandKind ? <CertBrandIcon kind={brandKind} /> : null}
        </div>
        <div className="nx-detail-hero__body">
          <p className="nx-detail-hero__kicker">
            {detail.isCa ? "证书颁发机构" : "终端 / 其他证书"}
          </p>
          <h2>{detail.displayName}</h2>
          {detail.filename ? (
            <p className="nx-detail-hero__file">{detail.filename}</p>
          ) : null}
          {detail.flags.length ? (
            <div className="nx-detail-hero__flags">
              {detail.flags.map((flag) => (
                <Tag
                  key={flag}
                  tone={flag === "已过期" || flag === "即将到期" ? "warn" : "default"}
                >
                  {flag}
                </Tag>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <DetailSection title="有效期">
        <CertValidityStrip
          notBefore={detail.notBeforeLabel}
          notAfter={detail.notAfterLabel}
          expired={detail.isExpired}
          daysLeft={detail.daysLeft}
          progress={detail.validityProgress}
        />
      </DetailSection>

      <CertDnBlock title="主体" dn={detail.subject} />
      <DetailSection
        title="颁发者"
        extra={
          detail.isSelfSigned ? <span className="nx-detail-self">自签发</span> : null
        }
      >
        <CertDnBlock embedded dn={detail.issuer} />
      </DetailSection>

      {detail.identity.length ? (
        <DetailSection title="标识">
          <CertFieldGrid fields={detail.identity} />
        </DetailSection>
      ) : null}

      {detail.crypto.length ? (
        <DetailSection title="密码学">
          <CertFieldGrid fields={detail.crypto} />
        </DetailSection>
      ) : null}

      {detail.extensions.length ? (
        <DetailSection title="扩展">
          <CertFieldGrid fields={detail.extensions} />
        </DetailSection>
      ) : null}

      {detail.fingerprints.length ? (
        <DetailSection title="指纹">
          <CertFingerprintList fields={detail.fingerprints} />
        </DetailSection>
      ) : null}

      {detail.extras.length ? (
        <DetailSection title="其他字段">
          <CertFieldGrid fields={detail.extras} />
        </DetailSection>
      ) : null}

      <p className="nx-detail-hint">点击任意字段即可复制到剪贴板</p>
    </>
  );
}
