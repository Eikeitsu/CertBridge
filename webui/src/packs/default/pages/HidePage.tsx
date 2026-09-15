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
    <div className="pk-def-page">
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
        <Card title={h.switchTitle} meta={h.switchMeta}>
          <HideAllowRow
            checked={hide.hideAllow}
            disabled={hide.isPending}
            onChange={hide.handleChange}
            title={h.allowTitle}
            descOn={h.allowOn}
            descOff={h.allowOff}
            large
          />
        </Card>
      ) : null}
      {zn.znHideSupported ? (
        <Card title={h.znSwitchTitle} meta={h.znSwitchMeta}>
          <HideAllowRow
            checked={zn.znHideAllow}
            disabled={zn.isPending}
            onChange={zn.handleChange}
            title={h.znAllowTitle}
            descOn={h.znAllowOn}
            descOff={h.znAllowOff}
            large
          />
        </Card>
      ) : (
        <Card title={h.znMissingTitle} meta={h.znMissingMeta}>
          <p className="pk-def-muted">{h.znMissingBody}</p>
        </Card>
      )}
      {zn.znHideSupported && !loaderOk ? (
        <Card title={h.loaderWarnTitle} meta={h.loaderWarnMeta}>
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
      <HideStatusCard />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
    </div>
  );
}
