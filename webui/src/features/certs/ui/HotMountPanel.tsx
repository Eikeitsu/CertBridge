import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { HotMountMode } from "@/entities/module/enums";
import { HOT_MOUNT_META } from "@/shared/config/certs";
import { useHotMountPanel } from "../hooks/useHotMountPanel";
import { resolveHotSessionLabel } from "../lib/hotSession";
import { Card } from "@/shared/ui/primitives";
import { HotMountAllowRow } from "./hot/HotMountAllowRow";
import { HotMountActiveSession } from "./hot/HotMountActiveSession";
import { HotMountForm } from "./hot/HotMountForm";

type HotMountPanelProps = {
  busy?: boolean;
  onSetHotAllow: (checked: boolean) => void;
  onMount: (mode: HotMountMode, sdPath?: string) => void;
  onUnmount: () => void;
  title?: string;
};

export function HotMountPanel({
  busy = false,
  onSetHotAllow,
  onMount,
  onUnmount,
  title = "临时挂载",
}: HotMountPanelProps) {
  const status = useAppSelector(selectModuleStatus);
  const { mode, setMode, sdPath, setSdPath } = useHotMountPanel();

  if (!isFlagOn(status.hot_supported)) return null;

  const isHotActive = isFlagOn(status.hot_active);
  const isHotPartial = isFlagOn(status.hot_partial);
  const isHotAllow = isFlagOn(status.hot_allow);
  const sessionLabel = resolveHotSessionLabel(status);

  return (
    <Card title={title} meta={isHotActive ? sessionLabel : HOT_MOUNT_META}>
      <HotMountAllowRow checked={isHotAllow} disabled={busy} onChange={onSetHotAllow} />

      {isHotActive ? (
        <HotMountActiveSession
          status={status}
          isPartial={isHotPartial}
          disabled={busy}
          onUnmount={onUnmount}
        />
      ) : isHotAllow ? (
        <HotMountForm
          mode={mode}
          sdPath={sdPath}
          disabled={busy}
          onModeChange={setMode}
          onSdPathChange={setSdPath}
          onMount={onMount}
        />
      ) : (
        <p style={{ fontSize: "0.8rem", color: "var(--cb-ink-3)" }}>
          请先开启「允许临时挂载」。
        </p>
      )}
    </Card>
  );
}
