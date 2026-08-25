import { HIDE_GUIDE_SECTIONS } from "@/shared/config/hideGuide";

type HideGuideSectionConfig = (typeof HIDE_GUIDE_SECTIONS)[number];

type HideGuideSectionProps = {
  section: HideGuideSectionConfig;
  defaultOpen?: boolean;
};

export function HideGuideSection({ section, defaultOpen }: HideGuideSectionProps) {
  const open = defaultOpen ?? (section.id === "capture" || section.id === "limits");
  return (
    <details open={open}>
      <summary>{section.title}</summary>
      <ul>
        {section.body.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
