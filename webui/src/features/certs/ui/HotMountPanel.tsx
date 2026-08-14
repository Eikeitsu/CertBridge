import { Button, Input } from "antd-mobile";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import type { HotMountMode } from "@/entities/module/enums";
import { DEFAULT_SD_CERT_DIR } from "@/shared/config/constants";
import { HOT_MOUNT_ACTIONS, HOT_MOUNT_META } from "@/shared/config/certs";
import { Flag, KvList, Panel, SectionLabel } from "@/shared/ui";
import { useHotMountPanel } from "../hooks/useHotMountPanel";
import { resolveHotSessionLabel } from "../lib/hotSession";

type HotMountPanelProps = {
  sectionLabel?: string;
  panelTitle?: string;
  onMount: (mode: HotMountMode, sdPath?: string) => void;
  onUnmount: () => void;
};

export function HotMountPanel({
  sectionLabel = "临时会话",
  panelTitle = "免重启挂载",
  onMount,
  onUnmount,
}: HotMountPanelProps) {
  const status = useAppSelector(selectModuleStatus);
  const { mode, setMode, sdPath, setSdPath } = useHotMountPanel();

  if (!isFlagOn(status.hot_supported)) return null;

  const isHotActive = isFlagOn(status.hot_active);
  const isHotPartial = isFlagOn(status.hot_partial);
  const sessionLabel = resolveHotSessionLabel(status);

  return (
    <>
      <SectionLabel>{sectionLabel}</SectionLabel>
      <Panel title={panelTitle} meta={isHotActive ? sessionLabel : HOT_MOUNT_META}>
        {isHotActive ? (
          <>
            <KvList
              items={[
                { label: "已加入", value: status.hot_added || "0" },
                { label: "命名空间", value: status.hot_namespaces || "0" },
              ]}
            />
            {isHotPartial ? (
              <p className="cb-muted" style={{ margin: "10px 0" }}>
                {status.hot_failed || "0"} 个命名空间未覆盖，可卸载后重试
              </p>
            ) : null}
            <div className="cb-actions__row" style={{ marginTop: 12 }}>
              {isHotPartial ? <Flag>部分未覆盖</Flag> : null}
              <Button color="danger" onClick={onUnmount}>
                无痕卸载
              </Button>
            </div>
          </>
        ) : (
          <>
            <label className="cb-path-field">
              <span className="cb-field-label">存储卡证书目录</span>
              <Input
                value={sdPath}
                onChange={setSdPath}
                placeholder={DEFAULT_SD_CERT_DIR}
                clearable
              />
            </label>
            <div className="cb-hot-actions">
              {HOT_MOUNT_ACTIONS.map((action) => (
                <Button
                  key={action.mode}
                  color={mode === action.mode ? "primary" : "default"}
                  onClick={() => {
                    setMode(action.mode);
                    onMount(action.mode, action.needsSdPath ? sdPath : undefined);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
