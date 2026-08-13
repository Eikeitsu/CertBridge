import { BottomSheet } from "@/shared/ui";
import { formatCertDetail } from "../lib/formatCertDetail";
import { CertDetailBody } from "./CertDetailBody";

type CertDetailSheetProps = {
  open: boolean;
  title: string;
  fields: Record<string, string> | null;
  loading: boolean;
  onClose: () => void;
};

export function CertDetailSheet({
  open,
  title,
  fields,
  loading,
  onClose,
}: CertDetailSheetProps) {
  const detail = fields ? formatCertDetail(fields, title) : null;

  return (
    <BottomSheet open={open} onClose={onClose} loading={loading}>
      {detail ? (
        <CertDetailBody detail={detail} />
      ) : (
        <p className="cb-empty">
          {fields?.error ||
            "未能解析该证书。请确认文件为 PEM/DER，且设备上的解析器可用。"}
        </p>
      )}
    </BottomSheet>
  );
}
