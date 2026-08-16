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
import {
  NxButton,
  NxCard,
  NxChip,
  NxField,
  NxInput,
  NxSection,
  NxSegment,
  NxSwitch,
  NxToggleRow,
} from "@/shared/ui";
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
  sectionLabel = "临时证书",
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
    <NxSection eyebrow="Session" title={sectionLabel}>
      <p className="nx-section-note">
        {panelTitle} · {panelMeta}
      </p>
      <NxCard>
        <NxToggleRow label="允许临时挂载" description="关闭后无法新建临时会话">
          <NxSwitch checked={isHotAllow} loading={busy} onChange={onSetHotAllow} />
        </NxToggleRow>
      </NxCard>

      <div className="nx-hot-deck">
        {isHotActive ? (
          <NxCard tone="accent">
            <p className="nx-section-note">{HOT_MOUNT_ACTIVE_META}</p>
            <div className="nx-kv">
              <div className="nx-kv__item">
                <span>已加入</span>
                <strong>{status.hot_added || "0"}</strong>
              </div>
              <div className="nx-kv__item">
                <span>命名空间</span>
                <strong>{status.hot_namespaces || "0"}</strong>
              </div>
            </div>
            {isHotPartial ? (
              <p className="nx-section-note">
                {status.hot_failed || "0"} 个命名空间未覆盖，可卸载后重试
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              {isHotPartial ? <NxChip tone="warn">部分未覆盖</NxChip> : null}
              <NxButton tone="danger" loading={busy} onClick={onUnmount}>
                无痕卸载
              </NxButton>
            </div>
          </NxCard>
        ) : isHotAllow ? (
          <NxCard>
            <NxSegment
              value={mode}
              onChange={(next) => setMode(next as HotMountMode)}
              options={HOT_MOUNT_MODE_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
            />
            {needsSdPath ? (
              <NxField label="存储卡证书目录">
                <NxInput
                  value={sdPath}
                  onChange={setSdPath}
                  placeholder={DEFAULT_SD_CERT_DIR}
                />
              </NxField>
            ) : null}
            <NxButton
              block
              loading={busy}
              onClick={() => onMount(mode, needsSdPath ? sdPath : undefined)}
            >
              开始临时挂载
            </NxButton>
          </NxCard>
        ) : (
          <NxCard>
            <p className="nx-section-note" style={{ margin: 0 }}>
              临时挂载已关闭。放入存储卡或用户区的证书不会自动生效；开启上方开关后可手动发起会话。
            </p>
          </NxCard>
        )}
      </div>
    </NxSection>
  );
}
