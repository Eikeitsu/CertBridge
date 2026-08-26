import { Card } from "@/shared/ui/primitives";
import { PageStack } from "@/shared/ui/layout";
import { ThemePack } from "@/entities/module/enums";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { useHideAllow } from "../hooks/useHideAllow";
import { useZnHideAllow } from "../hooks/useZnHideAllow";
import { HideAllowRow } from "./HideAllowRow";
import { HideCaptureWarning } from "./HideCaptureWarning";
import { HideIntroCard } from "./HideIntroCard";
import { HideStatusCard } from "./HideStatusCard";
import { HideGuidePanel } from "./HideGuidePanel";
import { CaptureChecklistCard } from "./CaptureChecklistCard";
import { ZnWhitelistEditor } from "./ZnWhitelistEditor";

export function HidePage() {
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  const status = useAppSelector(selectModuleStatus);
  const { pack, voice } = usePackVoice();
  const h = voice.hide;
  const loaderOk = isFlagOn(status.zygisk_loader_ok);
  const loaderWarn =
    zn.znHideSupported && !loaderOk ? (
      <Card title={h.loaderWarnTitle} meta={h.loaderWarnMeta}>
        <p className="cb-page-sub">{h.loaderWarnBody}</p>
      </Card>
    ) : null;

  const susfsCard = hide.hideSupported ? (
    <Card title={h.switchTitle} meta={h.switchMeta}>
      <HideAllowRow
        checked={hide.hideAllow}
        disabled={hide.isPending}
        onChange={hide.handleChange}
        title={h.allowTitle}
        descOn={h.allowOn}
        descOff={h.allowOff}
        large={pack === ThemePack.Studio}
      />
    </Card>
  ) : null;

  const znCard = zn.znHideSupported ? (
    <Card title={h.znSwitchTitle} meta={h.znSwitchMeta}>
      <HideAllowRow
        checked={zn.znHideAllow}
        disabled={zn.isPending}
        onChange={zn.handleChange}
        title={h.znAllowTitle}
        descOn={h.znAllowOn}
        descOff={h.znAllowOff}
        large={pack === ThemePack.Studio}
      />
    </Card>
  ) : null;

  const znMissing = !zn.znHideSupported ? (
    <Card title={h.znMissingTitle} meta={h.znMissingMeta}>
      <p className="cb-page-sub">{h.znMissingBody}</p>
    </Card>
  ) : null;

  const whitelist = zn.znHideSupported ? (
    <ZnWhitelistEditor
      title={h.whitelistTitle}
      meta={h.whitelistMeta}
      hint={h.whitelistHint}
      saveLabel={h.whitelistSave}
    />
  ) : null;

  const checklist = (
    <CaptureChecklistCard
      title={h.checklistTitle}
      meta={h.checklistMeta}
      dismissLabel={h.checklistDismiss}
    />
  );

  if (pack === ThemePack.Console) {
    return (
      <PageStack className="cb-stack--tight">
        <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} banner />
        {checklist}
        {susfsCard}
        {znCard}
        {loaderWarn}
        {znMissing}
        {whitelist}
        <HideStatusCard variant="table" />
        <HideIntroCard title={h.introTitle} body={h.introBody} docsCta={h.docsCta} />
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
        {checklist}
        {susfsCard}
        {znCard}
        {loaderWarn}
        {znMissing}
        {whitelist}
        <HideStatusCard />
        <HideIntroCard title={h.introTitle} body={h.introBody} docsCta={h.docsCta} />
        <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} accordion />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <HideCaptureWarning title={h.captureTitle} meta={h.captureMeta} />
      {checklist}
      {susfsCard}
      {znCard}
      {loaderWarn}
      {znMissing}
      {whitelist}
      <HideStatusCard />
      <HideIntroCard title={h.introTitle} body={h.introBody} docsCta={h.docsCta} />
      <HideGuidePanel title={h.guideTitle} meta={h.guideMeta} />
    </PageStack>
  );
}
