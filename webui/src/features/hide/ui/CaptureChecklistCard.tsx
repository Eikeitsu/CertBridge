import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Button, Notice } from "@/shared/ui/primitives";
import { STORAGE_KEYS } from "@/shared/config/paths";

type CaptureChecklistCardProps = {
  title?: string;
  meta?: string;
  dismissLabel?: string;
};

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.captureChecklistDismissed) === "1";
  } catch {
    return false;
  }
}

export function CaptureChecklistCard({
  title,
  meta,
  dismissLabel,
}: CaptureChecklistCardProps) {
  const { t } = useTranslation("webui");
  const [dismissed, setDismissed] = useState(readDismissed);
  const checklist = t("hide.checklistItems", { returnObjects: true }) as string[];

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.captureChecklistDismissed, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  return (
    <Card
      title={title ?? t("hide.checklistTitle")}
      meta={meta ?? t("hide.checklistMeta")}
    >
      <Notice tone="default">{t("hide.checklistNotice")}</Notice>
      <ol
        className="bf-bullet-list"
        data-style="decimal"
        style={{ color: "var(--bf-ink-2)", fontSize: "0.82rem" }}
      >
        {checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <div className="bf-btn-row" style={{ marginTop: 12 }}>
        <Button onClick={handleDismiss}>
          {dismissLabel ?? t("hide.checklistDismiss")}
        </Button>
      </div>
    </Card>
  );
}
