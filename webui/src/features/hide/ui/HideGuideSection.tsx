import { HIDE_GUIDE_SECTIONS } from "@/shared/config/hideGuide";

type HideGuideSectionConfig = (typeof HIDE_GUIDE_SECTIONS)[number];

type HideGuideSectionProps = {
  section: HideGuideSectionConfig;
  defaultOpen?: boolean;
};

export function HideGuideSection({ section, defaultOpen }: HideGuideSectionProps) {
  return (
    <details open={defaultOpen ?? section.id === "limits"}>
      <summary>{section.title}</summary>
      <ul>
        {section.body.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
