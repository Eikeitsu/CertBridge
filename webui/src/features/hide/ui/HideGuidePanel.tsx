import { HIDE_GUIDE_SECTIONS } from "@/shared/config/hideGuide";
import { Card } from "@/shared/ui/primitives";
import { HideGuideSection } from "./HideGuideSection";

type HideGuidePanelProps = {
  title?: string;
  meta?: string;
  accordion?: boolean;
  /** 外层已有 fold / panel 时只渲染条目，避免再套一层 Card */
  bare?: boolean;
};

export function HideGuidePanel({
  title,
  meta = "按 Root 方案配置；换路径不能替代 umount",
  accordion,
  bare,
}: HideGuidePanelProps) {
  const body = (
    <div className={`bf-hide-guide${accordion ? " bf-hide-guide--accordion" : ""}`}>
      {HIDE_GUIDE_SECTIONS.map((section) => (
        <HideGuideSection
          key={section.id}
          section={section}
          defaultOpen={accordion ? false : undefined}
        />
      ))}
    </div>
  );

  if (bare) {
    return (
      <>
        {meta ? <p className="bf-card-plain__meta">{meta}</p> : null}
        {body}
      </>
    );
  }

  return (
    <Card title={title} meta={meta}>
      {body}
    </Card>
  );
}
