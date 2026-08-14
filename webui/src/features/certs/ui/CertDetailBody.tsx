import { Flag, FlagList, SheetSection } from "@/shared/ui";
import { FlagTone, type BuiltinCertKind } from "@/entities/module/enums";
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

export function CertDetailBody({ detail, brandKind }: CertDetailBodyProps) {
  return (
    <>
      <header className="cb-sheet__hero">
        <div
          className={`cb-sheet__hero-mark${brandKind ? " has-brand" : ""}`}
          aria-hidden
        >
          {brandKind ? <CertBrandIcon kind={brandKind} className="is-hero" /> : null}
        </div>
        <div className="cb-sheet__hero-body">
          <p className="cb-sheet__kicker">
            {detail.isCa ? "证书颁发机构" : "终端 / 其他证书"}
          </p>
          <h2>{detail.displayName}</h2>
          {detail.filename ? <p className="cb-sheet__file">{detail.filename}</p> : null}
          {detail.flags.length ? (
            <FlagList className="cb-sheet__flags">
              {detail.flags.map((flag) => (
                <Flag
                  key={flag}
                  tone={
                    flag === "已过期" || flag === "即将到期"
                      ? FlagTone.Warn
                      : FlagTone.Info
                  }
                >
                  {flag}
                </Flag>
              ))}
            </FlagList>
          ) : null}
        </div>
      </header>

      <SheetSection title="有效期">
        <CertValidityStrip
          notBefore={detail.notBeforeLabel}
          notAfter={detail.notAfterLabel}
          expired={detail.isExpired}
          daysLeft={detail.daysLeft}
          progress={detail.validityProgress}
        />
      </SheetSection>

      <CertDnBlock title="主体" dn={detail.subject} />
      <SheetSection
        title="颁发者"
        extra={detail.isSelfSigned ? <p className="cb-sheet__self">自签发</p> : null}
      >
        <CertDnBlock embedded dn={detail.issuer} />
      </SheetSection>

      {detail.identity.length ? (
        <SheetSection title="标识">
          <CertFieldGrid fields={detail.identity} />
        </SheetSection>
      ) : null}

      {detail.crypto.length ? (
        <SheetSection title="密码学">
          <CertFieldGrid fields={detail.crypto} />
        </SheetSection>
      ) : null}

      {detail.extensions.length ? (
        <SheetSection title="扩展">
          <CertFieldGrid fields={detail.extensions} />
        </SheetSection>
      ) : null}

      {detail.fingerprints.length ? (
        <SheetSection title="指纹">
          <CertFingerprintList fields={detail.fingerprints} />
        </SheetSection>
      ) : null}

      {detail.extras.length ? (
        <SheetSection title="其他字段">
          <CertFieldGrid fields={detail.extras} />
        </SheetSection>
      ) : null}

      <p className="cb-sheet__copy-hint">点击任意字段即可复制到剪贴板</p>
    </>
  );
}
