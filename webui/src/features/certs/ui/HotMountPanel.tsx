import { Button, Card, Input, List, Segmented, Space, Switch, Tag } from "antd-mobile";
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
import { ListGroup } from "@/shared/ui/ListGroup";
import { PrefRow } from "@/shared/ui/PrefRow";
import { useHotMountPanel } from "../hooks/useHotMountPanel";
import { resolveHotSessionLabel } from "../lib/hotSession";

type HotMountPanelProps = {
  sectionLabel?: string;
  panelTitle?: string;
  panelMeta?: string;
  busy?: boolean;
  onSetHotAllow: (checked: boolean) => void;
  onMount: (mode: HotMountMode, sdPath?: string) => void;
  onUnmount: () => void;
};

export function HotMountPanel({
  sectionLabel = "临时证书",
  panelTitle = "免重启挂载",
  panelMeta,
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
  const meta = panelMeta || (isHotActive ? sessionLabel : HOT_MOUNT_META);

  return (
    <ListGroup title={sectionLabel} meta={`${panelTitle} · ${meta}`}>
      <PrefRow label="允许临时挂载" description="关闭后无法新建临时会话">
        <Switch checked={isHotAllow} loading={busy} onChange={onSetHotAllow} />
      </PrefRow>

      {isHotActive ? (
        <List.Item>
          <Card className="cb-hot-active">
            <p className="cb-panel__meta">{HOT_MOUNT_ACTIVE_META}</p>
            <div className="cb-kv">
              <div>
                <span>已加入</span>
                <strong>{status.hot_added || "0"}</strong>
              </div>
              <div>
                <span>命名空间</span>
                <strong>{status.hot_namespaces || "0"}</strong>
              </div>
            </div>
            <Space style={{ marginTop: 12 }} align="center" wrap>
              {isHotPartial ? <Tag color="warning">部分未覆盖</Tag> : null}
              <Button color="danger" loading={busy} onClick={onUnmount}>
                无痕卸载
              </Button>
            </Space>
          </Card>
        </List.Item>
      ) : isHotAllow ? (
        <List.Item>
          <div className="cb-hot-form">
            <Segmented
              block
              value={mode}
              onChange={(next) => setMode(String(next) as HotMountMode)}
              options={HOT_MOUNT_MODE_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
            />
            {needsSdPath ? (
              <Input
                clearable
                value={sdPath}
                placeholder={DEFAULT_SD_CERT_DIR}
                onChange={setSdPath}
                style={{ marginTop: 12 }}
              />
            ) : null}
            <Button
              block
              color="primary"
              loading={busy}
              style={{ marginTop: 12 }}
              onClick={() => onMount(mode, needsSdPath ? sdPath : undefined)}
            >
              开始临时挂载
            </Button>
          </div>
        </List.Item>
      ) : (
        <List.Item>
          临时挂载已关闭。开启上方开关后可手动发起会话。
        </List.Item>
      )}
    </ListGroup>
  );
}
