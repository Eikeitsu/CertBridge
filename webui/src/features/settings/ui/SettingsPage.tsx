import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { PageStack } from "@/shared/ui/layout";
import { AppearancePanel } from "./appearance/AppearancePanel";
import { MountModePanel } from "./MountModePanel";
import { TmpfsPathPanel } from "./TmpfsPathPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";

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
  const { voice } = usePackVoice();

  return (
    <PageStack className="bf-stack--loose">
      <div>
        <h1 className="bf-page-title">{voice.tabs.more}</h1>
        <p className="bf-page-sub">{voice.more.appearanceMeta}</p>
      </div>
      <AppearancePanel
        title={voice.more.appearanceTitle}
        meta={voice.more.appearanceMeta}
      />
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
      <AboutSection title={voice.more.aboutTitle} />
    </PageStack>
  );
}
