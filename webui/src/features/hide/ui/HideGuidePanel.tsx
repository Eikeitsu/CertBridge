import { HIDE_GUIDE_SECTIONS } from "@/shared/config/hideGuide";
import { Card } from "@/shared/ui/primitives";
import { HideGuideSection } from "./HideGuideSection";

type HideGuidePanelProps = {
  title?: string;
  meta?: string;
  accordion?: boolean;
};

export function HideGuidePanel({
  title = "隐藏说明",
  meta = "按 Root 方案配置；换路径不能替代 umount",
  accordion,
}: HideGuidePanelProps) {
  return (
    <Card title={title} meta={meta}>
      <div className={`cb-hide-guide${accordion ? " cb-hide-guide--accordion" : ""}`}>
        {HIDE_GUIDE_SECTIONS.map((section) => (
          <HideGuideSection
            key={section.id}
            section={section}
            defaultOpen={accordion ? false : undefined}
          />
        ))}
      </div>
    </Card>
  );
}
