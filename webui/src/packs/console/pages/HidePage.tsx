import { Card } from "@/shared/ui/primitives";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { useHideAllow } from "@/features/hide/hooks/useHideAllow";
import { useZnHideAllow } from "@/features/hide/hooks/useZnHideAllow";
import { useZnFilterMode } from "@/features/hide/hooks/useZnFilterMode";
import { useEnsureHideStatus } from "@/features/hide/hooks/useEnsureHideStatus";
import { HideAllowRow } from "@/features/hide/ui/HideAllowRow";
import { HideCaptureWarning } from "@/features/hide/ui/HideCaptureWarning";
import { HideStatusCard } from "@/features/hide/ui/HideStatusCard";
import { HideRootNotes } from "@/features/hide/ui/HideRootNotes";
import { HideGuidePanel } from "@/features/hide/ui/HideGuidePanel";
import { CaptureChecklistCard } from "@/features/hide/ui/CaptureChecklistCard";
import { ZnFilterModeRow } from "@/features/hide/ui/ZnFilterModeRow";
import { ZnFilterListEditor } from "@/features/hide/ui/ZnFilterListEditor";
import { HideExperimentPanel } from "@/features/hide/ui/HideExperimentPanel";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function ConsoleHidePage() {
  const chrome = usePackChrome();
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  const znMode = useZnFilterMode();
  useEnsureHideStatus();
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const loaderOk = isFlagOn(status.zygisk_loader_ok);

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
        <section className="pk-con-block">
          <div className="pk-con-block__head">{h.znSwitchTitle}</div>
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
        <pre className="pk-con-pre">{h.znMissingBody}</pre>
      )}
      {zn.znHideSupported && !loaderOk ? (
        <Card title={h.loaderWarnTitle}>
          <p className="pk-def-muted">{h.loaderWarnBody}</p>
        </Card>
      ) : null}
      {zn.znHideSupported || hide.hideSupported ? (
        <section className="pk-con-block">
          <div className="pk-con-block__head">{h.filterVsUmountTitle}</div>
          <p className="pk-def-muted">{h.filterVsUmountBody}</p>
        </section>
      ) : null}
      {zn.znHideSupported ? (
        <>
          <section className="pk-con-block">
            <div className="pk-con-block__head">{h.filterModeTitle}</div>
            <ZnFilterModeRow
              mode={znMode.mode}
              disabled={znMode.isPending}
              onChange={znMode.handleChange}
            />
          </section>
          <ZnFilterListEditor
            listKind={znMode.mode === "whitelist" ? "whitelist" : "blacklist"}
            saveLabel={h.whitelistSave}
          />
        </>
      ) : null}
      <HideExperimentPanel />
      <HideStatusCard variant="table" />
      <HideRootNotes />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} accordion />
    </div>
  );
}
