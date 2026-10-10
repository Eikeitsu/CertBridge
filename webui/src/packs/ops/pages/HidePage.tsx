import { useHideAllow } from "@/features/hide/hooks/useHideAllow";
import { useZnHideAllow } from "@/features/hide/hooks/useZnHideAllow";
import { useEnsureHideStatus } from "@/features/hide/hooks/useEnsureHideStatus";
import { HideAllowRow } from "@/features/hide/ui/HideAllowRow";
import { HideCaptureWarning } from "@/features/hide/ui/HideCaptureWarning";
import { HideStatusCard } from "@/features/hide/ui/HideStatusCard";
import { HideRootNotes } from "@/features/hide/ui/HideRootNotes";
import { HideGuidePanel } from "@/features/hide/ui/HideGuidePanel";
import { ZnFilterBlock } from "@/features/hide/ui/ZnFilterBlock";
import { HideExperimentPanel } from "@/features/hide/ui/HideExperimentPanel";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function OpsHidePage() {
  const chrome = usePackChrome();
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  useEnsureHideStatus();
  const { voice } = usePackVoice();
  const h = voice.hide;

  return (
    <div className="pk-ops-page pk-ops-page--hide">
      <header className="pk-ops-pagehead pk-ops-pagehead--meta">
        <p>{chrome.hide.sub}</p>
      </header>

      <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} banner />

      {hide.hideSupported ? (
        <section className="pk-ops-panel">
          <h2 className="pk-ops-panel__title">{h.switchTitle}</h2>
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
        <ZnFilterBlock variant="ops" listRows={3} listHint={false} />
      ) : (
        <section className="pk-ops-panel">
          <h2 className="pk-ops-panel__title">{h.znMissingTitle}</h2>
          <p className="pk-ops-empty">{h.znMissingBody}</p>
        </section>
      )}

      <HideExperimentPanel variant="block" />
      <HideStatusCard variant="table" />
      <HideRootNotes />
      <details className="pk-ops-fold">
        <summary>{h.guideTitle}</summary>
        <div className="pk-ops-fold__body">
          <HideGuidePanel meta={h.guideMeta} accordion bare />
        </div>
      </details>
    </div>
  );
}
