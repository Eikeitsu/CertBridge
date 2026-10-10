import { Card } from "@/shared/ui/primitives";
import { PageStack } from "@/shared/ui/layout";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { useHideAllow } from "../hooks/useHideAllow";
import { useZnHideAllow } from "../hooks/useZnHideAllow";
import { useEnsureHideStatus } from "../hooks/useEnsureHideStatus";
import { HideAllowRow } from "./HideAllowRow";
import { HideCaptureWarning } from "./HideCaptureWarning";
import { HideIntroCard } from "./HideIntroCard";
import { HideStatusCard } from "./HideStatusCard";
import { HideGuidePanel } from "./HideGuidePanel";
import { CaptureChecklistCard } from "./CaptureChecklistCard";
import { ZnFilterBlock } from "./ZnFilterBlock";
import { HideRootNotes } from "./HideRootNotes";
import { HideExperimentPanel } from "./HideExperimentPanel";

export function HidePage() {
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  useEnsureHideStatus();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const anyHide = hide.hideSupported || zn.znHideSupported;

  return (
    <PageStack className="bf-stack--loose">
      <div>
        <h1 className="bf-page-title">{voice.tabs.hide}</h1>
        <p className="bf-page-sub">{h.introBody}</p>
      </div>
      {bootstrapped && !anyHide ? (
        <Card title={h.znMissingTitle} meta={h.znMissingMeta}>
          <p className="bf-page-sub">{h.znMissingBody}</p>
        </Card>
      ) : null}
      <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} />
      <CaptureChecklistCard
        title={h.checklistTitle}
        meta={h.checklistMeta}
        dismissLabel={h.checklistDismiss}
      />
      {hide.hideSupported ? (
        <Card title={h.switchTitle} meta={h.switchMeta}>
          <HideAllowRow
            checked={hide.hideAllow}
            disabled={false}
            onChange={hide.handleChange}
            title={h.allowTitle}
            descOn={h.allowOn}
            descOff={h.allowOff}
          />
        </Card>
      ) : null}
      <ZnFilterBlock variant="card" />
      {bootstrapped && hide.hideSupported && !zn.znHideSupported ? (
        <Card title={h.znMissingTitle} meta={h.znMissingMeta}>
          <p className="bf-page-sub">{h.znMissingBody}</p>
        </Card>
      ) : null}
      <HideExperimentPanel />
      <HideStatusCard />
      <HideRootNotes />
      <HideIntroCard title={h.introTitle} body={h.introBody} docsCta={h.docsCta} />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
    </PageStack>
  );
}
