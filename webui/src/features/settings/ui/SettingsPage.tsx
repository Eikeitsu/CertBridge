import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useExperimental14System } from "@/features/settings/hooks/useExperimental14System";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { useQuietProp } from "@/features/settings/hooks/useQuietProp";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { PageStack } from "@/shared/ui/layout";
import { AppearancePanel } from "./appearance/AppearancePanel";
import { MountModePanel } from "./MountModePanel";
import { Experimental14SystemPanel } from "./Experimental14SystemPanel";
import { QuietPropPanel } from "./QuietPropPanel";
import { TmpfsPathPanel } from "./TmpfsPathPanel";
import { UpdateChannelPanel } from "./UpdateChannelPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";

export function SettingsPage() {
  const {
    mountMode,
    isPending: isMountPending,
    handleChange: handleMountChange,
  } = useMountMode();
  const {
    mode: experimental14Mode,
    isPending: isExperimental14Pending,
    handleChange: handleExperimental14Change,
  } = useExperimental14System();
  const {
    tmpfsStyle,
    isPending: isTmpfsPending,
    handleChange: handleTmpfsChange,
  } = useTmpfsStyle();
  const {
    dynamicOn,
    isPending: isQuietPending,
    handleChange: handleQuietChange,
  } = useQuietProp();
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
      <Experimental14SystemPanel
        mode={experimental14Mode}
        pending={isExperimental14Pending}
        onChange={(mode) => void handleExperimental14Change(mode)}
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfsStyle}
        pending={isTmpfsPending}
        onChange={(style) => void handleTmpfsChange(style)}
      />
      <QuietPropPanel
        dynamicOn={dynamicOn}
        pending={isQuietPending}
        onChange={(on) => void handleQuietChange(on)}
      />
      <UpdateChannelPanel />
      <AboutSection title={voice.more.aboutTitle} />
    </PageStack>
  );
}
