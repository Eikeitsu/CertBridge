import { useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
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

export function DefaultHidePage() {
  const chrome = usePackChrome();
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  useEnsureHideStatus();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const anyHide = hide.hideSupported || zn.znHideSupported;

  return (
    <div className="pk-def-page pk-def-page--hide">
      <header className="pk-def-pagehead">
        <h1>{chrome.hide.title}</h1>
        <p>{chrome.hide.sub}</p>
      </header>

      {bootstrapped && !anyHide ? (
        <section className="pk-def-section">
          <h2 className="pk-def-section__title">{h.znMissingTitle}</h2>
          <p className="pk-def-muted">{h.znMissingBody}</p>
        </section>
      ) : null}

      <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} />
      <CaptureChecklistCard
        title={h.checklistTitle}
        meta={h.checklistMeta}
        dismissLabel={h.checklistDismiss}
      />

      {hide.hideSupported ? (
        <section className="pk-def-section">
          <h2 className="pk-def-section__title">{h.switchTitle}</h2>
          <div className="pk-def-group">
            <HideAllowRow
              checked={hide.hideAllow}
              disabled={hide.isPending}
              onChange={hide.handleChange}
              title={h.allowTitle}
              descOn={h.allowOn}
              descOff={h.allowOff}
              large
            />
          </div>
        </section>
      ) : null}

      <ZnFilterBlock variant="section" large listRows={5} />

      {bootstrapped && hide.hideSupported && !zn.znHideSupported ? (
        <section className="pk-def-section">
          <h2 className="pk-def-section__title">{h.znMissingTitle}</h2>
          <p className="pk-def-muted">{h.znMissingBody}</p>
        </section>
      ) : null}

      <HideExperimentPanel variant="section" large />
      <HideStatusCard />
      <HideRootNotes />
      <details className="pk-def-fold">
        <summary>{h.guideTitle}</summary>
        <div className="pk-def-fold__body">
          <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
        </div>
      </details>
    </div>
  );
}
