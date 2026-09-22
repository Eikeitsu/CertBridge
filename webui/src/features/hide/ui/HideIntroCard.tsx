import { useTranslation } from "react-i18next";
import { LINKS } from "@/shared/config/brand";
import { openUrl } from "@/shared/api/ksu";
import { Button, Card } from "@/shared/ui/primitives";

type HideIntroCardProps = {
  title?: string;
  body?: string;
  docsCta?: string;
  compact?: boolean;
};

export function HideIntroCard({ title, body, docsCta, compact }: HideIntroCardProps) {
  const { t } = useTranslation("webui");
  if (compact) return null;

  return (
    <Card title={title ?? t("hide.introTitle")}>
      <p
        style={{
          margin: 0,
          fontSize: "0.85rem",
          color: "var(--bf-ink-2)",
          lineHeight: 1.55,
        }}
      >
        {body ?? t("hide.introBody")}
      </p>
      <div className="bf-btn-row" style={{ marginTop: 12 }}>
        <Button variant="ghost" onClick={() => void openUrl(`${LINKS.docs}guide/hide`)}>
          {docsCta ?? t("hide.docsCta")}
        </Button>
      </div>
    </Card>
  );
}
