import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { ThemePack } from "@/entities/module/enums";
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
  const { pack, voice } = usePackVoice();

  const stackClass =
    pack === ThemePack.Studio
      ? "cb-stack--loose"
      : pack === ThemePack.Console
        ? "cb-stack--tight"
        : undefined;

  return (
    <PageStack className={stackClass}>
      {pack === ThemePack.Studio ? (
        <div>
          <h1 className="cb-page-title">{voice.tabs.more}</h1>
          <p className="cb-page-sub">{voice.more.appearanceMeta}</p>
        </div>
      ) : null}
      <AppearancePanel
        title={voice.more.appearanceTitle}
        meta={voice.more.appearanceMeta}
        dense={pack === ThemePack.Console}
        heroCards={pack === ThemePack.Studio}
      />
      <MountModePanel
        mountMode={mountMode}
        pending={isMountPending}
        onChange={(mode) => void handleMountChange(mode)}
        dense={pack === ThemePack.Console}
      />
      <TmpfsPathPanel
        tmpfsStyle={tmpfsStyle}
        pending={isTmpfsPending}
        onChange={(style) => void handleTmpfsChange(style)}
        dense={pack === ThemePack.Console}
      />
      <AboutSection
        title={voice.more.aboutTitle}
        heroEmphasis={pack === ThemePack.Studio}
      />
    </PageStack>
  );
}
