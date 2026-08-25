import { HIDE_GUIDE_SECTIONS } from "@/shared/config/hideGuide";
import { Card } from "@/shared/ui/primitives";
import { HideGuideSection } from "./HideGuideSection";

export function HideGuidePanel() {
  return (
    <Card title="隐藏说明" meta="基于 2025–2026 Root 生态；换路径不能替代 umount">
      <div className="cb-hide-guide">
        {HIDE_GUIDE_SECTIONS.map((section) => (
          <HideGuideSection key={section.id} section={section} />
        ))}
      </div>
    </Card>
  );
}
