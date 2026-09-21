import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useExperimental14System } from "@/features/settings/hooks/useExperimental14System";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { useQuietProp } from "@/features/settings/hooks/useQuietProp";
import { MountModePanel } from "./MountModePanel";
import { Experimental14SystemPanel } from "./Experimental14SystemPanel";
import { QuietPropPanel } from "./QuietPropPanel";
import { TmpfsPathPanel } from "./TmpfsPathPanel";

type MountInjectPanelsProps = {
  dense?: boolean;
  surface?: "card" | "plain";
  /** default pack 用 section 包一层 */
  wrapSection?: boolean;
};

/** 挂载模式 / A14 / tmpfs / 动态属性 — 收入「挂载与注入」二级页 */
export function MountInjectPanels({
  dense,
  surface = "card",
  wrapSection,
}: MountInjectPanelsProps) {
  const mount = useMountMode();
  const experimental14 = useExperimental14System();
  const tmpfs = useTmpfsStyle();
  const quiet = useQuietProp();

  const body = (
    <>
      <MountModePanel
        mountMode={mount.mountMode}
        pending={mount.isPending}
        onChange={(mode) => void mount.handleChange(mode)}
        dense={dense}
        surface={surface}
      />
      <Experimental14SystemPanel
        mode={experimental14.mode}
        pending={experimental14.isPending}
        onChange={(mode) => void experimental14.handleChange(mode)}
        dense={dense}
        surface={surface}
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfs.tmpfsStyle}
        pending={tmpfs.isPending}
        onChange={(style) => void tmpfs.handleChange(style)}
        dense={dense}
        surface={surface}
      />
      <QuietPropPanel
        dynamicOn={quiet.dynamicOn}
        pending={quiet.isPending}
        onChange={(on) => void quiet.handleChange(on)}
        dense={dense}
        surface={surface}
      />
    </>
  );

  if (!wrapSection) return <div className="bf-stack bf-stack--loose">{body}</div>;

  return (
    <div className="bf-stack bf-stack--loose">
      <section className="pk-def-section">{body}</section>
    </div>
  );
}
