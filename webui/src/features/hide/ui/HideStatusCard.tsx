import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { HIDE_PROVIDER_LABELS, MOUNT_MODES, TMPFS_STYLES } from "@/shared/config/mount";
import { parseEnum } from "@/shared/lib/enum";
import { MountMode, TmpfsStyle } from "@/entities/module/enums";
import { Card, ListGroup, Row, Tag } from "@/shared/ui/primitives";

export function HideStatusCard() {
  const status = useAppSelector(selectModuleStatus);
  const mountMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);
  const tmpfsStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Dev);
  const provider =
    status.hide_provider_label ||
    HIDE_PROVIDER_LABELS[status.hide_provider || "none"] ||
    "未检测到";
  const hideApplied = isFlagOn(status.hide_applied);

  return (
    <Card title="挂载与隐藏实况" meta={status.hide_summary || "基于当前设备探测"}>
      <ListGroup>
        <Row title="Root 方案" extra={status.root || "—"} />
        <Row title="证书挂载模式" extra={MOUNT_MODES[mountMode].label} />
        <Row title="临时层路径" extra={status.stage_root || TMPFS_STYLES[tmpfsStyle].paths[0]} />
        <Row title="路径风格" extra={TMPFS_STYLES[tmpfsStyle].label} />
        <Row
          title="检测到的隐藏助手"
          extra={
            <Tag tone={status.hide_provider && status.hide_provider !== "none" ? "ok" : "warn"}>
              {provider}
            </Tag>
          }
        />
        <Row
          title="本模块 try_umount"
          extra={
            <Tag tone={hideApplied ? "ok" : "default"}>
              {hideApplied ? "已注册" : "未注册 / 无 SuSFS"}
            </Tag>
          }
        />
      </ListGroup>
    </Card>
  );
}
