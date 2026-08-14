import { AppearancePanel } from "@/features/theme/ui/AppearancePanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { useAppSelector } from "@/app/store/hooks";
import { selectThemePack } from "@/features/theme/model/selectors";
import { getPackVoice } from "@/shared/config/packVoice";
import { PageSpin, SectionLabel } from "@/shared/ui";
import { MountModePanel } from "./MountModePanel";
import { TmpfsPathPanel } from "./TmpfsPathPanel";
import { SettingsWorkflow } from "./SettingsWorkflow";

export function SettingsPage() {
  const pack = useAppSelector(selectThemePack);
  const voice = getPackVoice(pack);
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
    <PageSpin spinning={isMountPending || isTmpfsPending} label={voice.applyingHint}>
      <SectionLabel>{voice.settingsUi}</SectionLabel>
      <AppearancePanel />

      <SectionLabel>{voice.settingsModule}</SectionLabel>
      <MountModePanel
        mountMode={mountMode}
        onChange={(mode) => void handleMountChange(mode)}
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfsStyle}
        onChange={(style) => void handleTmpfsChange(style)}
      />
      <SettingsWorkflow />

      <SectionLabel>{voice.settingsAbout}</SectionLabel>
      <AboutSection />
    </PageSpin>
  );
}
