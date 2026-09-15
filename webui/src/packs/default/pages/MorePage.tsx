import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { AppearancePanel } from "@/features/settings/ui/appearance/AppearancePanel";
import { MountModePanel } from "@/features/settings/ui/MountModePanel";
import { TmpfsPathPanel } from "@/features/settings/ui/TmpfsPathPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { DEFAULT_VOICE } from "../voice";

export function DefaultMorePage() {
  const mount = useMountMode();
  const tmpfs = useTmpfsStyle();
  const v = DEFAULT_VOICE.more;

  return (
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>{v.appearanceMeta}</p>
      </header>
      <AppearancePanel title={v.appearance} meta={v.appearanceMeta} />
      <MountModePanel
        mountMode={mount.mountMode}
        pending={mount.isPending}
        onChange={(mode) => void mount.handleChange(mode)}
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfs.tmpfsStyle}
        pending={tmpfs.isPending}
        onChange={(style) => void tmpfs.handleChange(style)}
      />
      <AboutSection title={v.about} heroEmphasis />
    </div>
  );
}
