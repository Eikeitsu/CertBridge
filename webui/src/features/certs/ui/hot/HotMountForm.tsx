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
  const selectedMode = HOT_MOUNT_MODE_OPTIONS.find((option) => option.value === mode);
  const needsSdPath = selectedMode?.needsSdPath ?? false;

  return (
    <>
      <Segment
        value={mode}
        disabled={disabled}
        options={HOT_MOUNT_MODE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.needsSdPath ? "需指定存储卡目录" : undefined,
        }))}
        onChange={(value) => onModeChange(value as HotMountMode)}
      />
      {needsSdPath ? (
        <input
          className="cb-btn"
          style={{ width: "100%", marginTop: 8 }}
          value={sdPath}
          placeholder={DEFAULT_SD_CERT_DIR}
          disabled={disabled}
          onChange={(event) => onSdPathChange(event.target.value)}
        />
      ) : null}
      <div className="cb-btn-row" style={{ marginTop: 12 }}>
        <Button
          variant="primary"
          disabled={disabled}
          onClick={() => onMount(mode, needsSdPath ? sdPath : undefined)}
        >
          开始临时挂载
        </Button>
      </div>
    </>
  );
}
