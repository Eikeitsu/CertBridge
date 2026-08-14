import { BottomSheet } from "@/shared/ui";
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
  const detail = fields ? formatCertDetail(fields, title) : null;
  const brandKind = resolveCertBrandKind(
    sourceId,
    detail?.displayName || title,
    detail?.filename || fields?.filename,
  );

  return (
    <BottomSheet open={open} onClose={onClose} loading={loading} title="证书详情">
      {detail ? (
        <CertDetailBody detail={detail} brandKind={brandKind} />
      ) : (
        <p className="cb-empty">
          {fields?.error ||
            "未能解析该证书。请确认文件为 PEM/DER，且设备上的解析器可用。"}
        </p>
      )}
    </BottomSheet>
  );
}
