import { useTranslation } from "react-i18next";
import { HIDE_ROOT_NOTES } from "@/shared/config/mount";
import { Card } from "@/shared/ui/primitives";

type HideRootNotesProps = {
  title?: string;
  meta?: string;
  surface?: "card" | "plain";
};

/** 各 Root 方案的隐藏要点（原挂载子页下方说明） */
export function HideRootNotes({ title, meta, surface = "card" }: HideRootNotesProps) {
  const { t } = useTranslation("webui");
  return (
    <Card
      title={title ?? t("hide.rootsTitle")}
      meta={meta ?? t("hide.rootsMeta")}
      surface={surface}
    >
      <ul className="bf-bullet-list">
        {HIDE_ROOT_NOTES.map((root) => (
          <li key={root.name}>
            <strong>{root.name}</strong>: {t(root.noteKey)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
