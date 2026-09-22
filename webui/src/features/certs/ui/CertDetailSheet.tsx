import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Button } from "@/shared/ui/primitives";
import { formatCertDetail } from "../lib/formatCertDetail";
import { resolveCertBrandKind } from "../lib/resolveCertBrand";
import { CertDetailBody } from "./CertDetailBody";

type CertDetailSheetProps = {
  open: boolean;
  title: string;
  sourceId?: string;
  fields: Record<string, string> | null;
  loading: boolean;
  onClose: () => void;
};

export function CertDetailSheet({
  open,
  title,
  sourceId,
  fields,
  loading,
  onClose,
}: CertDetailSheetProps) {
  const { t } = useTranslation("webui");
  const detail =
    fields && Object.keys(fields).length ? formatCertDetail(fields, title) : null;
  const brandKind = resolveCertBrandKind(
    sourceId,
    detail?.displayName || title,
    detail?.filename || fields?.filename,
  );
  const showError = !loading && !detail;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      loading={loading}
      loadingLabel={t("certs.parseLoading")}
      title={t("certs.detailTitle")}
    >
      {detail ? (
        <CertDetailBody detail={detail} brandKind={brandKind} />
      ) : showError ? (
        <>
          <p className="bf-empty-text">{fields?.error || t("certs.parseFail")}</p>
          {fields?.error ? (
            <Button
              variant="ghost"
              onClick={onClose}
              style={{ width: "100%", marginTop: 8 }}
            >
              {t("ui.close")}
            </Button>
          ) : null}
        </>
      ) : (
        <div aria-hidden style={{ minHeight: 200 }} />
      )}
    </BottomSheet>
  );
}
