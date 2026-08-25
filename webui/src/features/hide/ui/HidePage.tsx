import { Card } from "@/shared/ui/primitives";
import { PageStack } from "@/shared/ui/layout";
import { ThemePack } from "@/entities/module/enums";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { useHideAllow } from "../hooks/useHideAllow";
import { HideAllowRow } from "./HideAllowRow";
import { HideCaptureWarning } from "./HideCaptureWarning";
import { HideIntroCard } from "./HideIntroCard";
import { HideStatusCard } from "./HideStatusCard";
import { HideGuidePanel } from "./HideGuidePanel";

export function HidePage() {
  const { hideAllow, isPending, handleChange } = useHideAllow();
  const { pack, voice } = usePackVoice();
  const h = voice.hide;

  if (pack === ThemePack.Console) {
    return (
      <PageStack className="cb-stack--tight">
        <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} banner />
        <Card title={h.switchTitle} meta={h.switchMeta}>
          <HideAllowRow
            checked={hideAllow}
            disabled={isPending}
            onChange={handleChange}
            title={h.allowTitle}
            descOn={h.allowOn}
            descOff={h.allowOff}
          />
        </Card>
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
        <Card>
          <HideAllowRow
            checked={hideAllow}
            disabled={isPending}
            onChange={handleChange}
            title={h.allowTitle}
            descOn={h.allowOn}
            descOff={h.allowOff}
            large
          />
        </Card>
        <HideStatusCard />
        <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} accordion />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} />
      <Card title={h.switchTitle} meta={h.switchMeta}>
        <HideAllowRow
          checked={hideAllow}
          disabled={isPending}
          onChange={handleChange}
          title={h.allowTitle}
          descOn={h.allowOn}
          descOff={h.allowOff}
        />
      </Card>
      <HideIntroCard title={h.introTitle} body={h.introBody} docsCta={h.docsCta} />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
    </PageStack>
  );
}
