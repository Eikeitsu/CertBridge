import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { useAppSelector } from "@/app/store/hooks";
import { selectDeviceLabel, selectModuleStatus } from "@/features/status/model/selectors";
import { ListGroup, Row } from "@/shared/ui/primitives";

export function AboutModuleInfo() {
  const status = useAppSelector(selectModuleStatus);
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  return (
    <ListGroup>
      <Row title="版本" extra={status.version || EMPTY_PLACEHOLDER} />
      <Row title="设备" extra={deviceLabel || EMPTY_PLACEHOLDER} />
      <Row title="系统" extra={androidLabel} />
      <Row title="Root" extra={status.root || EMPTY_PLACEHOLDER} />
      <Row title="挂载模式" extra={status.mount_mode || EMPTY_PLACEHOLDER} />
      <Row title="临时路径" extra={status.tmpfs_style || EMPTY_PLACEHOLDER} />
    </ListGroup>
  );
}
