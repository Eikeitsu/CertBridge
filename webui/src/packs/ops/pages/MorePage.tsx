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
import { OPS_VOICE } from "../voice";

export function OpsMorePage() {
  const mount = useMountMode();
  const experimental14 = useExperimental14System();
  const tmpfs = useTmpfsStyle();
  const quiet = useQuietProp();
  const v = OPS_VOICE.more;

  return (
    <div className="pk-ops-page pk-ops-page--more">
      <header className="pk-ops-pagehead pk-ops-pagehead--meta">
        <p>{v.appearanceMeta}</p>
      </header>
      <AppearancePanel
        title={v.appearance}
        meta={v.appearanceMeta}
        surface="plain"
      />
      <MountModePanel
        mountMode={mount.mountMode}
        pending={mount.isPending}
        onChange={(mode) => void mount.handleChange(mode)}
        dense
        surface="plain"
      />
      <Experimental14SystemPanel
        mode={experimental14.mode}
        pending={experimental14.isPending}
        onChange={(mode) => void experimental14.handleChange(mode)}
        dense
        surface="plain"
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfs.tmpfsStyle}
        pending={tmpfs.isPending}
        onChange={(style) => void tmpfs.handleChange(style)}
        dense
        surface="plain"
      />
      <QuietPropPanel
        dynamicOn={quiet.dynamicOn}
        pending={quiet.isPending}
        onChange={(on) => void quiet.handleChange(on)}
        dense
        surface="plain"
      />
      <UpdateChannelPanel dense surface="plain" />
      <AboutSection title={v.about} layout="ops" />
    </div>
  );
}
