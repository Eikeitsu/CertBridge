import { Button, NoticeBar } from "antd-mobile";
import { LoopOutline } from "antd-mobile-icons";
import { Flag, StatusStage } from "@/shared/ui";
import { FlagTone, type TrustTone } from "@/entities/module/enums";

type OverviewStageProps = {
  tone: TrustTone;
  title: string;
  description: string;
  diagnosisMessage?: string;
  isPendingReboot: boolean;
  isHotMountActive: boolean;
  onRefresh: () => void;
  onViewLog: () => void;
};

export function OverviewStage({
  tone,
  title,
  description,
  diagnosisMessage,
  isPendingReboot,
  isHotMountActive,
  onRefresh,
  onViewLog,
}: OverviewStageProps) {
  return (
    <StatusStage
      tone={tone}
      title={title}
      description={description}
      diagnosis={
        diagnosisMessage ? (
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
        ) : null
      }
      flags={
        <>
          {isPendingReboot ? <Flag>待重启生效</Flag> : null}
          {isHotMountActive ? <Flag tone={FlagTone.Info}>临时证书已挂载</Flag> : null}
        </>
      }
      footer={
        <Button size="mini" fill="none" onClick={onRefresh}>
          <LoopOutline />
          刷新状态
        </Button>
      }
    />
  );
}
