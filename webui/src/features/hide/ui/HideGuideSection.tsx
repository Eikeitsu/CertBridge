import { useTranslation } from "react-i18next";
import type { HideGuideSectionId } from "@/shared/config/hideGuide";

type HideGuideSectionProps = {
  section: HideGuideSectionId;
  defaultOpen?: boolean;
};

export function HideGuideSection({ section, defaultOpen }: HideGuideSectionProps) {
  const { t } = useTranslation("webui");
  const open = defaultOpen ?? (section === "capture" || section === "limits");
  const body = t(`hide.guideSections.${section}.body`, {
    returnObjects: true,
  }) as string[];
  return (
    <details open={open}>
      <summary>{t(`hide.guideSections.${section}.title`)}</summary>
      <ul>
        {body.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
