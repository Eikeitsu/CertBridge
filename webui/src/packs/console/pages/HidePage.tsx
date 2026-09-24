import { Card } from "@/shared/ui/primitives";
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
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function ConsoleHidePage() {
  const chrome = usePackChrome();
  const hide = useHideAllow();
  const zn = useZnHideAllow();
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
      {zn.znHideSupported ? (
        <ZnWhitelistEditor
          title={h.whitelistTitle}
          meta={h.whitelistMeta}
          hint={h.whitelistHint}
          saveLabel={h.whitelistSave}
        />
      ) : null}
      <HideExperimentPanel />
      <HideStatusCard variant="table" />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} accordion />
    </div>
  );
}
