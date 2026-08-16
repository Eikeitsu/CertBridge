import { AppearancePanel } from "@/features/theme/ui/AppearancePanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { MountModePanel } from "./MountModePanel";
import { TmpfsPathPanel } from "./TmpfsPathPanel";

export function SettingsPage() {
  const {
    mountMode,
    isPending: isMountPending,
    handleChange: handleMountChange,
  } = useMountMode();
  const {
    tmpfsStyle,
    isPending: isTmpfsPending,
    handleChange: handleTmpfsChange,
  } = useTmpfsStyle();

  return (
    <div className="ov-stack settings-page">
      <AppearancePanel />
      <MountModePanel
        mountMode={mountMode}
        pending={isMountPending}
        onChange={(mode) => void handleMountChange(mode)}
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfsStyle}
        pending={isTmpfsPending}
        onChange={(style) => void handleTmpfsChange(style)}
      />
      <AboutSection />
    </div>
  );
}
