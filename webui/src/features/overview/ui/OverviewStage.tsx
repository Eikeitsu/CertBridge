import { Button, NoticeBar } from "antd-mobile";
import { LoopOutline } from "antd-mobile-icons";
import { Flag, StatusStage } from "@/shared/ui";
import { FlagTone, ThemePack, type TrustTone } from "@/entities/module/enums";

type OverviewStageProps = {
  pack: ThemePack;
  tone: TrustTone;
  title: string;
  description: string;
  kicker: string;
  refreshLabel: string;
  heroValue?: string | number;
  diagnosisMessage?: string;
  isPendingReboot: boolean;
  isHotMountActive: boolean;
  onRefresh: () => void;
  onViewLog: () => void;
};

export function OverviewStage({
  pack,
  tone,
  title,
  description,
  kicker,
  refreshLabel,
  heroValue,
  diagnosisMessage,
  isPendingReboot,
  isHotMountActive,
  onRefresh,
  onViewLog,
}: OverviewStageProps) {
  const showHeroValue = pack === ThemePack.Material;

  return (
    <StatusStage
      tone={tone}
      kicker={kicker}
      title={title}
      description={description}
      heroValue={heroValue}
      showHeroValue={showHeroValue}
      diagnosis={
        diagnosisMessage ? (
          <div className="cb-diag">
            <NoticeBar
              color="alert"
              content={diagnosisMessage}
              extra={
                <Button size="mini" fill="none" color="primary" onClick={onViewLog}>
                  日志
                </Button>
              }
              wrap
            />
          </div>
        ) : null
      }
      flags={
        <>
          {isPendingReboot ? <Flag>待重启生效</Flag> : null}
          {isHotMountActive ? <Flag tone={FlagTone.Info}>临时证书已挂载</Flag> : null}
        </>
      }
      footer={
        <Button size="small" fill="outline" color="primary" onClick={onRefresh}>
          <LoopOutline />
          {refreshLabel}
        </Button>
      }
    />
  );
}
