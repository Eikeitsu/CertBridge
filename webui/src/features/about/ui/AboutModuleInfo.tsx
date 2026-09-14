import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { useAppSelector } from "@/app/store/hooks";
import { selectDeviceLabel, selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { ListGroup, Row } from "@/shared/ui/primitives";

function yesNo(flag: string | undefined, fallbackInstalled?: boolean) {
  if (flag === "1" || flag === "0") return flag === "1" ? "已安装" : "未安装";
  if (fallbackInstalled !== undefined) return fallbackInstalled ? "已安装" : "未安装";
  return EMPTY_PLACEHOLDER;
}

export function AboutModuleInfo() {
  const status = useAppSelector(selectModuleStatus);
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  const modeLabel =
    status.profile_install_mode === "default"
      ? "默认安装"
      : status.profile_install_mode === "custom"
        ? "自定义安装"
        : status.profile_install_mode || EMPTY_PLACEHOLDER;

  return (
    <ListGroup>
      <Row title="版本" extra={status.version || EMPTY_PLACEHOLDER} />
      <Row title="设备" extra={deviceLabel || EMPTY_PLACEHOLDER} />
      <Row title="系统" extra={androidLabel} />
      <Row title="Root" extra={status.root || EMPTY_PLACEHOLDER} />
      <Row title="挂载模式" extra={status.mount_mode || EMPTY_PLACEHOLDER} />
      <Row title="临时路径" extra={status.tmpfs_style || EMPTY_PLACEHOLDER} />
      <Row title="安装方案" extra={modeLabel} />
      <Row title="WebUI 组件" extra={yesNo(status.profile_webui, true)} />
      <Row title="热挂载组件" extra={yesNo(status.profile_hot, isFlagOn(status.hot_supported))} />
      <Row
        title="挂载隐藏协助"
        extra={yesNo(status.profile_hide_assist, isFlagOn(status.hide_supported))}
      />
      <Row
        title="Zygisk 挂载过滤"
        extra={yesNo(status.profile_zn_hide, isFlagOn(status.zn_hide_supported))}
      />
    </ListGroup>
  );
}
