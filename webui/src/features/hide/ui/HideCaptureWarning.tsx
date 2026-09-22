import { useTranslation } from "react-i18next";
import { Notice, Card } from "@/shared/ui/primitives";

type HideCaptureWarningProps = {
  title?: string;
  meta?: string;
  banner?: boolean;
};

export function HideCaptureWarning({ title, meta, banner }: HideCaptureWarningProps) {
  const { t } = useTranslation("webui");
  const resolvedTitle = title ?? t("hide.captureTitle");
  const resolvedMeta = meta ?? t("hide.captureMeta");
  if (banner) {
    return (
      <Notice tone="alert">
        <strong>{resolvedTitle}</strong>: {t("hide.captureWarning.banner")}
      </Notice>
    );
  }

  return (
    <Card title={resolvedTitle} meta={resolvedMeta}>
      <Notice tone="alert">{t("hide.captureWarning.notice")}</Notice>
      <ul
        className="bf-bullet-list"
        style={{ color: "var(--bf-ink-2)", fontSize: "0.82rem" }}
      >
        <li>
          <strong style={{ color: "var(--bf-ink)" }}>
            {t("hide.captureWarning.toolLabel")}
          </strong>
          : {t("hide.captureWarning.toolText")}
        </li>
        <li>
          <strong style={{ color: "var(--bf-ink)" }}>
            {t("hide.captureWarning.targetLabel")}
          </strong>
          : {t("hide.captureWarning.targetText")}
        </li>
        <li>{t("hide.captureWarning.scope")}</li>
        <li>{t("hide.captureWarning.force")}</li>
      </ul>
    </Card>
  );
}
