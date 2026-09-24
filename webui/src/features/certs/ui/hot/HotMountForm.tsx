import { useTranslation } from "react-i18next";
import { HotMountMode } from "@/entities/module/enums";
import { DEFAULT_SD_CERT_DIR } from "@/shared/config/constants";
import { HOT_MOUNT_MODE_OPTIONS } from "@/shared/config/certs";
import { Button, Segment } from "@/shared/ui/primitives";

type HotMountFormProps = {
  mode: HotMountMode;
  sdPath: string;
  disabled?: boolean;
  onModeChange: (mode: HotMountMode) => void;
  onSdPathChange: (path: string) => void;
  onMount: (mode: HotMountMode, sdPath?: string) => void;
};

export function HotMountForm({
  mode,
  sdPath,
  disabled,
  onModeChange,
  onSdPathChange,
  onMount,
}: HotMountFormProps) {
  const { t } = useTranslation("webui");
  const selectedMode = HOT_MOUNT_MODE_OPTIONS.find((option) => option.value === mode);
  const needsSdPath = selectedMode?.needsSdPath ?? false;

  return (
    <>
      <Segment
        value={mode}
        disabled={disabled}
        options={HOT_MOUNT_MODE_OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
          hint: option.needsSdPath ? t("certs.hotSdPathHint") : undefined,
        }))}
        onChange={(value) => onModeChange(value as HotMountMode)}
      />
      {needsSdPath ? (
        <input
          className="bf-btn"
          style={{ width: "100%", marginTop: 8 }}
          value={sdPath}
          placeholder={DEFAULT_SD_CERT_DIR}
          disabled={disabled}
          onChange={(event) => onSdPathChange(event.target.value)}
        />
      ) : null}
      <div className="bf-btn-row" style={{ marginTop: 12 }}>
        <Button
          variant="primary"
          disabled={disabled}
          onClick={() => onMount(mode, needsSdPath ? sdPath : undefined)}
        >
          {t("certs.hotStart")}
        </Button>
      </div>
    </>
  );
}
