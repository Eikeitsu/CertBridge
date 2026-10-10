import { useHideAllow } from "@/features/hide/hooks/useHideAllow";
import { useZnHideAllow } from "@/features/hide/hooks/useZnHideAllow";
import { useEnsureHideStatus } from "@/features/hide/hooks/useEnsureHideStatus";
import { HideAllowRow } from "@/features/hide/ui/HideAllowRow";
import { HideCaptureWarning } from "@/features/hide/ui/HideCaptureWarning";
import { HideStatusCard } from "@/features/hide/ui/HideStatusCard";
import { HideRootNotes } from "@/features/hide/ui/HideRootNotes";
import { HideGuidePanel } from "@/features/hide/ui/HideGuidePanel";
import { CaptureChecklistCard } from "@/features/hide/ui/CaptureChecklistCard";
import { ZnFilterBlock } from "@/features/hide/ui/ZnFilterBlock";
import { HideExperimentPanel } from "@/features/hide/ui/HideExperimentPanel";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function ConsoleHidePage() {
  const chrome = usePackChrome();
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  useEnsureHideStatus();
  const { voice } = usePackVoice();
  const h = voice.hide;

  return (
    <div className="pk-con-page">
      <pre className="pk-con-banner">{`# ${chrome.hide.title}
# ${chrome.hide.sub}`}</pre>
      <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} banner />
      <CaptureChecklistCard
        title={h.checklistTitle}
        meta={h.checklistMeta}
        dismissLabel={h.checklistDismiss}
      />
      {hide.hideSupported ? (
        <section className="pk-con-block">
          <div className="pk-con-block__head">{h.switchTitle}</div>
          <HideAllowRow
            checked={hide.hideAllow}
            disabled={hide.isPending}
            onChange={hide.handleChange}
            title={h.allowTitle}
            descOn={h.allowOn}
            descOff={h.allowOff}
          />
        </section>
      ) : null}
      {zn.znHideSupported ? (
        <ZnFilterBlock variant="console" />
      ) : (
        <pre className="pk-con-pre">{h.znMissingBody}</pre>
      )}
      <HideExperimentPanel />
      <HideStatusCard variant="table" />
      <HideRootNotes />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} accordion />
    </div>
  );
}
