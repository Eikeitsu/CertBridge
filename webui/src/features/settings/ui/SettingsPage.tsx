import { AppearancePanel } from "@/features/theme/ui/AppearancePanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { PageSpin, SectionLabel } from "@/shared/ui";
import { MountModePanel } from "./MountModePanel";
import { TmpfsPathPanel } from "./TmpfsPathPanel";
import { SettingsWorkflow } from "./SettingsWorkflow";

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
    <PageSpin spinning={isMountPending || isTmpfsPending}>
      <SectionLabel>界面</SectionLabel>
      <AppearancePanel />

      <SectionLabel>模块</SectionLabel>
      <MountModePanel
        mountMode={mountMode}
        onChange={(mode) => void handleMountChange(mode)}
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfsStyle}
        onChange={(style) => void handleTmpfsChange(style)}
      />
      <SettingsWorkflow />

      <SectionLabel>关于</SectionLabel>
      <AboutSection />
    </PageSpin>
  );
}
