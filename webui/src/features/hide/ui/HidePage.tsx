import { Card } from "@/shared/ui/primitives";
import { PageStack } from "@/shared/ui/layout";
import { ThemePack } from "@/entities/module/enums";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { useHideAllow } from "../hooks/useHideAllow";
import { useZnHideAllow } from "../hooks/useZnHideAllow";
import { HideAllowRow } from "./HideAllowRow";
import { HideCaptureWarning } from "./HideCaptureWarning";
import { HideIntroCard } from "./HideIntroCard";
import { HideStatusCard } from "./HideStatusCard";
import { HideGuidePanel } from "./HideGuidePanel";

export function HidePage() {
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  const { pack, voice } = usePackVoice();
  const h = voice.hide;

  const susfsCard = hide.hideSupported ? (
    <Card title={h.switchTitle} meta={h.switchMeta}>
      <HideAllowRow
        checked={hide.hideAllow}
        disabled={hide.isPending}
        onChange={hide.handleChange}
        title={h.allowTitle}
        descOn={h.allowOn}
        descOff={h.allowOff}
        large={pack === ThemePack.Studio}
      />
    </Card>
  ) : null;

  const znCard = zn.znHideSupported ? (
    <Card title={h.znSwitchTitle} meta={h.znSwitchMeta}>
      <HideAllowRow
        checked={zn.znHideAllow}
        disabled={zn.isPending}
        onChange={zn.handleChange}
        title={h.znAllowTitle}
        descOn={h.znAllowOn}
        descOff={h.znAllowOff}
        large={pack === ThemePack.Studio}
      />
    </Card>
  ) : null;

  if (pack === ThemePack.Console) {
    return (
      <PageStack className="cb-stack--tight">
        <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} banner />
        {susfsCard}
        {znCard}
        <HideStatusCard variant="table" />
        <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
      </PageStack>
    );
  }

  if (pack === ThemePack.Studio) {
    return (
      <PageStack className="cb-stack--loose">
        <div>
          <h1 className="cb-page-title">{voice.tabs.hide}</h1>
          <p className="cb-page-sub">{h.introBody}</p>
        </div>
        <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} />
        {susfsCard}
        {znCard}
        <HideStatusCard />
        <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} accordion />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} />
      {susfsCard}
      {znCard}
      <HideIntroCard title={h.introTitle} body={h.introBody} docsCta={h.docsCta} />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
    </PageStack>
  );
}
