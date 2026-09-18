import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { HIDE_PROVIDER_LABELS, MOUNT_MODES, TMPFS_STYLES } from "@/shared/config/mount";
import { parseEnum } from "@/shared/lib/enum";
import { MountMode, TmpfsStyle } from "@/entities/module/enums";
import { Card, ListGroup, Row, Tag } from "@/shared/ui/primitives";

type HideStatusCardProps = {
  variant?: "list" | "table";
  title?: string;
};

export function HideStatusCard({
  variant = "list",
  title = "挂载与隐藏实况",
}: HideStatusCardProps) {
  const status = useAppSelector(selectModuleStatus);
  const mountMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);
  const tmpfsStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Dev);
  const provider =
    status.hide_provider_label ||
    HIDE_PROVIDER_LABELS[status.hide_provider || "none"] ||
    "未检测到";
  const hideApplied = isFlagOn(status.hide_applied);
  const hideSusfs = isFlagOn(status.hide_susfs);
  const hideKsud = isFlagOn(status.hide_ksud_umount);
  const znSupported = isFlagOn(status.zn_hide_supported);
  const znAllow = isFlagOn(status.zn_hide_allow);
  const metaParts = [status.hide_summary, status.zn_hide_summary].filter(Boolean);
  const meta = metaParts.length ? metaParts.join(" · ") : "基于当前设备探测";
  const tryUmountLabel = hideApplied
    ? "已注册"
    : hideSusfs || hideKsud
      ? "未登记"
      : "无 SuSFS/ksud";

  const rows = [
    { k: "Root", v: status.root || "—" },
    { k: "挂载", v: MOUNT_MODES[mountMode].label },
    { k: "STAGE", v: status.stage_root || TMPFS_STYLES[tmpfsStyle].paths[0] },
    { k: "路径", v: TMPFS_STYLES[tmpfsStyle].label },
    { k: "助手", v: provider },
    { k: "SuSFS", v: hideSusfs ? "TRY_UMOUNT 可用" : "未检测到" },
    { k: "try_umount", v: tryUmountLabel },
  ];
  if (znSupported) {
    rows.push({ k: "Zygisk过滤", v: znAllow ? "已开启" : "已关闭" });
    rows.push({
      k: "Zygisk底座",
      v: status.zygisk_loader_label || status.zygisk_loader || "—",
    });
    if (isFlagOn(status.zn_hide_zn_module)) {
      rows.push({ k: "ZN辅路径", v: "已声明" });
    }
  }

  if (variant === "table") {
    return (
      <Card title={title} meta={meta}>
        <table className="bf-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.k}>
                <td>{row.k}</td>
                <td>{row.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  return (
    <Card title={title} meta={meta}>
      <ListGroup>
        <Row title="Root 方案" extra={status.root || "—"} />
        <Row title="证书挂载模式" extra={MOUNT_MODES[mountMode].label} />
        <Row
          title="临时层路径"
          extra={status.stage_root || TMPFS_STYLES[tmpfsStyle].paths[0]}
        />
        <Row title="路径风格" extra={TMPFS_STYLES[tmpfsStyle].label} />
        <Row
          title="检测到的隐藏助手"
          extra={
            <Tag
              tone={
                status.hide_provider && status.hide_provider !== "none" ? "ok" : "warn"
              }
            >
              {provider}
            </Tag>
          }
        />
        <Row
          title="SuSFS TRY_UMOUNT"
          extra={
            <Tag tone={hideSusfs ? "ok" : "warn"}>
              {hideSusfs ? "可用" : "未检测到"}
            </Tag>
          }
        />
        <Row
          title="本模块 try_umount"
          extra={
            <Tag tone={hideApplied ? "ok" : hideSusfs || hideKsud ? "warn" : "default"}>
              {tryUmountLabel}
            </Tag>
          }
        />
        {znSupported ? (
          <Row
            title="Zygisk 挂载过滤"
            extra={
              <Tag tone={znAllow ? "ok" : "default"}>{znAllow ? "已开启" : "已关闭"}</Tag>
            }
          />
        ) : null}
        {znSupported ? (
          <Row
            title="Zygisk 底座"
            extra={
              <Tag tone={isFlagOn(status.zygisk_loader_ok) ? "ok" : "warn"}>
                {status.zygisk_loader_label || status.zygisk_loader || "未检测"}
              </Tag>
            }
          />
        ) : null}
        {znSupported && isFlagOn(status.zn_hide_zn_module) ? (
          <Row title="ZN Module 辅路径" extra={<Tag tone="ok">已声明</Tag>} />
        ) : null}
      </ListGroup>
    </Card>
  );
}
