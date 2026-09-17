import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useExperimental14System } from "@/features/settings/hooks/useExperimental14System";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { useQuietProp } from "@/features/settings/hooks/useQuietProp";
import { AppearancePanel } from "@/features/settings/ui/appearance/AppearancePanel";
import { MountModePanel } from "@/features/settings/ui/MountModePanel";
import { Experimental14SystemPanel } from "@/features/settings/ui/Experimental14SystemPanel";
import { QuietPropPanel } from "@/features/settings/ui/QuietPropPanel";
import { TmpfsPathPanel } from "@/features/settings/ui/TmpfsPathPanel";
import { UpdateChannelPanel } from "@/features/settings/ui/UpdateChannelPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { DEFAULT_VOICE } from "../voice";

export function DefaultMorePage() {
  const mount = useMountMode();
  const experimental14 = useExperimental14System();
  const tmpfs = useTmpfsStyle();
  const quiet = useQuietProp();
  const v = DEFAULT_VOICE.more;

  return (
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>{v.appearanceMeta}</p>
      </header>

      <section className="pk-def-section">
        <AppearancePanel title={v.appearance} meta={v.appearanceMeta} />
      </section>
      <section className="pk-def-section">
        <MountModePanel
          mountMode={mount.mountMode}
          pending={mount.isPending}
          onChange={(mode) => void mount.handleChange(mode)}
        />
      </section>
      <section className="pk-def-section">
        <Experimental14SystemPanel
          mode={experimental14.mode}
          pending={experimental14.isPending}
          onChange={(mode) => void experimental14.handleChange(mode)}
        />
      </section>
      <section className="pk-def-section">
        <TmpfsPathPanel
          tmpfsStyle={tmpfs.tmpfsStyle}
          pending={tmpfs.isPending}
          onChange={(style) => void tmpfs.handleChange(style)}
        />
      </section>
      <section className="pk-def-section">
        <QuietPropPanel
          dynamicOn={quiet.dynamicOn}
          pending={quiet.isPending}
          onChange={(on) => void quiet.handleChange(on)}
        />
      </section>
      <section className="pk-def-section">
        <UpdateChannelPanel />
      </section>
      <section className="pk-def-section">
      <AboutSection title={v.about} layout="dashboard" />
      </section>
    </div>
  );
}
