import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { AppearancePanel } from "@/features/settings/ui/appearance/AppearancePanel";
import { MountModePanel } from "@/features/settings/ui/MountModePanel";
import { TmpfsPathPanel } from "@/features/settings/ui/TmpfsPathPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { CONSOLE_VOICE } from "../voice";

export function ConsoleMorePage() {
  const mount = useMountMode();
  const tmpfs = useTmpfsStyle();
  const v = CONSOLE_VOICE.more;

  return (
    <div className="pk-con-page">
      <pre className="pk-con-banner">{`# ${v.title}
# ${v.appearanceMeta}`}</pre>
      <AppearancePanel title={v.appearance} meta={v.appearanceMeta} />
      <MountModePanel
        mountMode={mount.mountMode}
        pending={mount.isPending}
        onChange={(mode) => void mount.handleChange(mode)}
        dense
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfs.tmpfsStyle}
        pending={tmpfs.isPending}
        onChange={(style) => void tmpfs.handleChange(style)}
        dense
      />
      <AboutSection title={v.about} />
    </div>
  );
}
