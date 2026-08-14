import { Button, Input, List, Switch } from "antd-mobile";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { HotMountMode } from "@/entities/module/enums";
import { DEFAULT_SD_CERT_DIR } from "@/shared/config/constants";
import {
  HOT_MOUNT_ACTIVE_META,
  HOT_MOUNT_META,
  HOT_MOUNT_MODE_OPTIONS,
} from "@/shared/config/certs";
import { Flag, KvList, Panel, PrefRow, SectionLabel, Segmented } from "@/shared/ui";
import { useHotMountPanel } from "../hooks/useHotMountPanel";
import { resolveHotSessionLabel } from "../lib/hotSession";

type HotMountPanelProps = {
  sectionLabel?: string;
  panelTitle?: string;
  busy?: boolean;
  onSetHotAllow: (checked: boolean) => void;
  onMount: (mode: HotMountMode, sdPath?: string) => void;
  onUnmount: () => void;
};

export function HotMountPanel({
  sectionLabel = "临时会话",
  panelTitle = "免重启挂载",
  busy = false,
  onSetHotAllow,
  onMount,
  onUnmount,
}: HotMountPanelProps) {
  const status = useAppSelector(selectModuleStatus);
  const { mode, setMode, sdPath, setSdPath } = useHotMountPanel();

  if (!isFlagOn(status.hot_supported)) return null;

  const isHotActive = isFlagOn(status.hot_active);
  const isHotPartial = isFlagOn(status.hot_partial);
  const isHotAllow = isFlagOn(status.hot_allow);
  const sessionLabel = resolveHotSessionLabel(status);
  const selectedMode = HOT_MOUNT_MODE_OPTIONS.find((option) => option.value === mode);
  const needsSdPath = selectedMode?.needsSdPath ?? false;

  const panelMeta = isHotActive ? sessionLabel : HOT_MOUNT_META;

  return (
    <>
      <SectionLabel>{sectionLabel}</SectionLabel>
      <Panel title={panelTitle} meta={panelMeta}>
        <List mode="card" className="cb-hot-panel__prefs">
          <PrefRow label="允许临时挂载" description="关闭后无法新建临时会话">
            <Switch checked={isHotAllow} loading={busy} onChange={onSetHotAllow} />
          </PrefRow>
        </List>

        {isHotActive ? (
          <>
            <p className="cb-muted">{HOT_MOUNT_ACTIVE_META}</p>
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
              <Button color="danger" loading={busy} onClick={onUnmount}>
                无痕卸载
              </Button>
            </div>
          </>
        ) : isHotAllow ? (
          <>
            <Segmented
              value={mode}
              onChange={(next) => setMode(next as HotMountMode)}
              options={HOT_MOUNT_MODE_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
            />
            {needsSdPath ? (
              <label className="cb-path-field">
                <span className="cb-field-label">存储卡证书目录</span>
                <Input
                  value={sdPath}
                  onChange={setSdPath}
                  placeholder={DEFAULT_SD_CERT_DIR}
                  clearable
                />
              </label>
            ) : null}
            <div className="cb-hot-actions">
              <Button
                color="primary"
                block
                loading={busy}
                onClick={() => onMount(mode, needsSdPath ? sdPath : undefined)}
              >
                开始临时挂载
              </Button>
            </div>
          </>
        ) : (
          <p className="cb-muted">
            临时挂载已关闭。放入存储卡或用户区的证书不会自动生效；开启上方开关后可手动发起会话。
          </p>
        )}
      </Panel>
    </>
  );
}
