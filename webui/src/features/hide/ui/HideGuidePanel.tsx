import { useTranslation } from "react-i18next";
import { HIDE_GUIDE_SECTION_IDS } from "@/shared/config/hideGuide";
import { Card } from "@/shared/ui/primitives";
import { HideGuideSection } from "./HideGuideSection";

type HideGuidePanelProps = {
  title?: string;
  meta?: string;
  accordion?: boolean;
  /** 外层已有 fold / panel 时只渲染条目，避免再套一层 Card */
  bare?: boolean;
};

export function HideGuidePanel({ title, meta, accordion, bare }: HideGuidePanelProps) {
  const { t } = useTranslation("webui");
  const resolvedTitle = title ?? t("hide.guideTitle");
  const resolvedMeta = meta ?? t("hide.guideMeta");
  const body = (
    <div className={`bf-hide-guide${accordion ? " bf-hide-guide--accordion" : ""}`}>
      {HIDE_GUIDE_SECTION_IDS.map((section) => (
        <HideGuideSection
          key={section}
          section={section}
          defaultOpen={accordion ? false : undefined}
        />
      ))}
    </div>
  );

  if (bare) {
    return (
      <>
        {resolvedMeta ? <p className="bf-card-plain__meta">{resolvedMeta}</p> : null}
        {body}
      </>
    );
  }

  return (
    <Card title={resolvedTitle} meta={resolvedMeta}>
      {body}
    </Card>
  );
}
