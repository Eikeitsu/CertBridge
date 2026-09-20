import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { useHideAllow } from "@/features/hide/hooks/useHideAllow";
import { useZnHideAllow } from "@/features/hide/hooks/useZnHideAllow";
import { HideAllowRow } from "@/features/hide/ui/HideAllowRow";
import { HideCaptureWarning } from "@/features/hide/ui/HideCaptureWarning";
import { HideStatusCard } from "@/features/hide/ui/HideStatusCard";
import { HideGuidePanel } from "@/features/hide/ui/HideGuidePanel";
import { CaptureChecklistCard } from "@/features/hide/ui/CaptureChecklistCard";
import { ZnWhitelistEditor } from "@/features/hide/ui/ZnWhitelistEditor";
import { HideExperimentPanel } from "@/features/hide/ui/HideExperimentPanel";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { DEFAULT_VOICE } from "../voice";

export function DefaultHidePage() {
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const loaderOk = isFlagOn(status.zygisk_loader_ok);

  return (
    <div className="pk-def-page pk-def-page--hide">
      <header className="pk-def-pagehead">
        <h1>{DEFAULT_VOICE.hide.title}</h1>
        <p>{DEFAULT_VOICE.hide.sub}</p>
      </header>

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

      {zn.znHideSupported ? (
        <section className="pk-def-section">
          <h2 className="pk-def-section__title">{h.znSwitchTitle}</h2>
          <div className="pk-def-group">
            <HideAllowRow
              checked={zn.znHideAllow}
              disabled={zn.isPending}
              onChange={zn.handleChange}
              title={h.znAllowTitle}
              descOn={h.znAllowOn}
              descOff={h.znAllowOff}
              large
            />
          </div>
          {h.znSwitchMeta ? (
            <p className="pk-def-muted pk-def-muted--tight">{h.znSwitchMeta}</p>
          ) : null}
        </section>
      ) : (
        <section className="pk-def-section">
          <h2 className="pk-def-section__title">{h.znMissingTitle}</h2>
          <p className="pk-def-muted">{h.znMissingBody}</p>
        </section>
      )}

      {zn.znHideSupported && !loaderOk ? (
        <div className="pk-def-banner is-warn">
          <strong>{h.loaderWarnTitle}</strong>
          <div>{h.loaderWarnBody}</div>
        </div>
      ) : null}

      {zn.znHideSupported ? (
        <ZnWhitelistEditor
          title={h.whitelistTitle}
          meta={h.whitelistMeta}
          hint={h.whitelistHint}
          saveLabel={h.whitelistSave}
          rows={5}
        />
      ) : null}

      <HideExperimentPanel variant="section" large />
      <HideStatusCard />
      <details className="pk-def-fold">
        <summary>{h.guideTitle}</summary>
        <div className="pk-def-fold__body">
          <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
        </div>
      </details>
    </div>
  );
}
