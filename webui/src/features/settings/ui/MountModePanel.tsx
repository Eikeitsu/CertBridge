import { useTranslation } from "react-i18next";
import { MountMode } from "@/entities/module/enums";
import { MOUNT_MODE_OPTIONS, MOUNT_META_NOTES } from "@/shared/config/mount";
import { Card, Segment } from "@/shared/ui/primitives";

type MountModePanelProps = {
  mountMode: MountMode;
  pending?: boolean;
  onChange: (mode: MountMode) => void;
  dense?: boolean;
  surface?: "card" | "plain";
};

export function MountModePanel({
  mountMode,
  pending,
  onChange,
  dense,
  surface = "card",
}: MountModePanelProps) {
  const { t } = useTranslation("webui");
  return (
    <Card
      title={t("more.mountMode")}
      meta={t("more.mountConfig.modeFootnote")}
      surface={surface}
      className={dense ? "bf-card--dense" : undefined}
    >
      <Segment
        value={mountMode}
        disabled={pending}
        options={MOUNT_MODE_OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
          hint: t(option.metaKey),
        }))}
        onChange={(value) => onChange(value as MountMode)}
      />
      <p className="bf-mount-meta__lead">{t("mount.meta.lead")}</p>
      <ul className="bf-bullet-list">
        {MOUNT_META_NOTES.map((root) => (
          <li key={root.name}>
            <strong>{root.name}</strong>: {t(root.noteKey)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
