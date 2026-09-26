import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { useHideAllow } from "@/features/hide/hooks/useHideAllow";
import { useZnHideAllow } from "@/features/hide/hooks/useZnHideAllow";
import { useEnsureHideStatus } from "@/features/hide/hooks/useEnsureHideStatus";
import { HideAllowRow } from "@/features/hide/ui/HideAllowRow";
import { HideCaptureWarning } from "@/features/hide/ui/HideCaptureWarning";
import { HideStatusCard } from "@/features/hide/ui/HideStatusCard";
import { HideRootNotes } from "@/features/hide/ui/HideRootNotes";
import { HideGuidePanel } from "@/features/hide/ui/HideGuidePanel";
import { ZnWhitelistEditor } from "@/features/hide/ui/ZnWhitelistEditor";
import { HideExperimentPanel } from "@/features/hide/ui/HideExperimentPanel";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function OpsHidePage() {
  const chrome = usePackChrome();
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  useEnsureHideStatus();
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const loaderOk = isFlagOn(status.zygisk_loader_ok);

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
        <section className="pk-ops-panel">
          <h2 className="pk-ops-panel__title">{h.znSwitchTitle}</h2>
          <HideAllowRow
            checked={zn.znHideAllow}
            disabled={zn.isPending}
            onChange={zn.handleChange}
            title={h.znAllowTitle}
            descOn={h.znAllowOn}
            descOff={h.znAllowOff}
          />
        </section>
      ) : (
        <section className="pk-ops-panel">
          <h2 className="pk-ops-panel__title">{h.znMissingTitle}</h2>
          <p className="pk-ops-empty">{h.znMissingBody}</p>
        </section>
      )}

      {zn.znHideSupported && !loaderOk ? (
        <div className="pk-ops-alert">{h.loaderWarnBody}</div>
      ) : null}

      {zn.znHideSupported ? (
        <ZnWhitelistEditor
          title={h.whitelistTitle}
          meta={`${h.whitelistMeta} · ${h.whitelistHint}`}
          hint=""
          saveLabel={h.whitelistSave}
          rows={3}
        />
      ) : null}

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
