import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { HIDE_PROVIDER_LABELS, TMPFS_STYLES } from "@/shared/config/mount";
import { parseEnum } from "@/shared/lib/enum";
import { MountMode, TmpfsStyle } from "@/entities/module/enums";
import { Card, ListGroup, Row, Tag } from "@/shared/ui/primitives";

type HideStatusCardProps = {
  variant?: "list" | "table";
  title?: string;
};

export function HideStatusCard({ variant = "list", title }: HideStatusCardProps) {
  const { t } = useTranslation("webui");
  const status = useAppSelector(selectModuleStatus);
  const mountMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);
  const tmpfsStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Dev);
  const providerKey = status.hide_provider || "none";
  const providerLabelKey = HIDE_PROVIDER_LABELS[providerKey];
  const provider =
    (providerLabelKey ? t(providerLabelKey) : undefined) ||
    status.hide_provider_label ||
    t("hide.status.notDetected");
  const hideApplied = isFlagOn(status.hide_applied);
  const hideSusfs = isFlagOn(status.hide_susfs);
  const hideKsud = isFlagOn(status.hide_ksud_umount);
  const hideNohello = isFlagOn(status.hide_nohello);
  const hideKuFeat = isFlagOn(status.hide_kernel_umount_feature);
  const znSupported = isFlagOn(status.zn_hide_supported);
  const znAllow = isFlagOn(status.zn_hide_allow);
  const forceBind = isFlagOn(status.force_bind_capture);
  const lateInject = isFlagOn(status.late_inject);
  const bootZygote =
    status.boot_bind_zygote === undefined || status.boot_bind_zygote === ""
      ? false
      : isFlagOn(status.boot_bind_zygote);
  const multiApex =
    status.boot_multi_apex === undefined || status.boot_multi_apex === ""
      ? false
      : isFlagOn(status.boot_multi_apex);
  const serviceProbe =
    status.service_probe === undefined || status.service_probe === ""
      ? false
      : isFlagOn(status.service_probe);
  const metaParts = [status.hide_summary, status.zn_hide_summary].filter(Boolean);
  const meta = metaParts.length ? metaParts.join(" · ") : t("hide.status.deviceProbe");
  const canRegister = hideSusfs || hideKsud || hideNohello;
  const tryUmountLabel = hideApplied
    ? t("hide.status.registered")
    : canRegister
      ? t("hide.status.notRegistered")
      : t("hide.status.noProvider");
  const mountModeLabel =
    mountMode === MountMode.Magic
      ? t("hide.status.mountModeMagic")
      : t("hide.status.mountModeCompatible");
  const tmpfsStyleLabel = t(
    `hide.status.tmpfs${
      tmpfsStyle === TmpfsStyle.Dev
        ? "Dev"
        : tmpfsStyle === TmpfsStyle.Mnt
          ? "Mnt"
          : tmpfsStyle === TmpfsStyle.Short
            ? "Short"
            : "Legacy"
    }`,
  );

  const rows = [
    { k: "Root", v: status.root || "—" },
    { k: t("hide.status.mount"), v: mountModeLabel },
    { k: "STAGE", v: status.stage_root || TMPFS_STYLES[tmpfsStyle].paths[0] },
    { k: t("hide.status.pathStyle"), v: tmpfsStyleLabel },
    {
      k: t("hide.status.forceBind"),
      v: t(forceBind ? "hide.status.forceBindOn" : "hide.status.forceBindOff"),
    },
    {
      k: t("hide.status.lateInject"),
      v: t(lateInject ? "hide.status.lateInjectOn" : "hide.status.lateInjectOff"),
    },
    {
      k: t("hide.status.bootZygote"),
      v: t(bootZygote ? "hide.status.bootZygoteOn" : "hide.status.bootZygoteOff"),
    },
    {
      k: t("hide.status.bootTargets"),
      v: t(multiApex ? "hide.status.bootTargetsOn" : "hide.status.bootTargetsOff"),
    },
    {
      k: t("hide.status.serviceProbe"),
      v: t(serviceProbe ? "hide.status.serviceProbeOn" : "hide.status.serviceProbeOff"),
    },
    { k: t("hide.status.provider"), v: provider },
    {
      k: "SuSFS",
      v: hideSusfs ? t("hide.status.susfsReady") : t("hide.status.notDetected"),
    },
    {
      k: "NoHello",
      v: hideNohello ? t("hide.status.noHelloReady") : t("hide.status.notDetected"),
    },
    {
      k: "kernel_umount",
      v: hideKuFeat
        ? t("hide.status.kernelUmountOn")
        : hideKsud || status.root?.includes("Kernel")
          ? t("hide.status.kernelUmountUnknown")
          : "—",
    },
    { k: "try_umount", v: tryUmountLabel },
  ];
  if (status.hide_try_umount_paths) {
    rows.push({ k: t("hide.status.registeredPaths"), v: status.hide_try_umount_paths });
  }
  if (znSupported) {
    rows.push({
      k: t("hide.status.zygiskFilter"),
      v: t(znAllow ? "hide.status.enabled" : "hide.status.disabled"),
    });
    rows.push({
      k: t("hide.status.zygiskBase"),
      v: status.zygisk_loader_label || status.zygisk_loader || "—",
    });
    if (isFlagOn(status.zn_hide_zn_module)) {
      rows.push({ k: t("hide.status.znPath"), v: t("hide.status.declared") });
    }
  }

  if (variant === "table") {
    return (
      <Card title={title ?? t("hide.status.title")} meta={meta}>
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
    <Card title={title ?? t("hide.status.title")} meta={meta}>
      <ListGroup>
        <Row title={t("hide.status.root")} extra={status.root || "—"} />
        <Row title={t("hide.status.mount")} extra={mountModeLabel} />
        <Row
          title={t("hide.status.stagePath")}
          extra={status.stage_root || TMPFS_STYLES[tmpfsStyle].paths[0]}
        />
        <Row title={t("hide.status.pathStyle")} extra={tmpfsStyleLabel} />
        <Row
          title={t("hide.status.forceBind")}
          extra={
            <Tag tone={forceBind ? "warn" : "ok"}>
              {t(forceBind ? "hide.status.forceBindOn" : "hide.status.forceBindOff")}
            </Tag>
          }
        />
        <Row
          title={t("hide.status.lateInject")}
          extra={
            <Tag tone={lateInject ? "warn" : "ok"}>
              {t(lateInject ? "hide.status.lateInjectOn" : "hide.status.lateInjectOff")}
            </Tag>
          }
        />
        <Row
          title={t("hide.status.bootZygote")}
          extra={
            <Tag tone={bootZygote ? "ok" : "warn"}>
              {t(bootZygote ? "hide.status.bootZygoteOn" : "hide.status.bootZygoteOff")}
            </Tag>
          }
        />
        <Row
          title={t("hide.status.bootTargets")}
          extra={
            <Tag tone={multiApex ? "ok" : "warn"}>
              {t(multiApex ? "hide.status.bootTargetsOn" : "hide.status.bootTargetsOff")}
            </Tag>
          }
        />
        <Row
          title={t("hide.status.serviceProbe")}
          extra={
            <Tag tone={serviceProbe ? "ok" : "warn"}>
              {t(
                serviceProbe
                  ? "hide.status.serviceProbeOn"
                  : "hide.status.serviceProbeOff",
              )}
            </Tag>
          }
        />
        <Row
          title={t("hide.status.provider")}
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
              {hideSusfs ? t("hide.status.susfsReady") : t("hide.status.notDetected")}
            </Tag>
          }
        />
        <Row
          title="NoHello"
          extra={
            <Tag tone={hideNohello ? "ok" : "warn"}>
              {hideNohello
                ? t("hide.status.noHelloPointReady")
                : t("hide.status.notDetected")}
            </Tag>
          }
        />
        <Row
          title="KSU kernel_umount"
          extra={
            <Tag tone={hideKuFeat ? "ok" : "warn"}>
              {hideKuFeat
                ? t("hide.status.kernelUmountOn")
                : t("hide.status.kernelUmountWarning")}
            </Tag>
          }
        />
        <Row
          title={t("hide.status.tryUmount")}
          extra={
            <Tag tone={hideApplied ? "ok" : canRegister ? "warn" : "default"}>
              {tryUmountLabel}
            </Tag>
          }
        />
        {status.hide_try_umount_paths ? (
          <Row title="try_umount.txt" extra={status.hide_try_umount_paths} />
        ) : null}
        {znSupported ? (
          <Row
            title={t("hide.status.zygiskFilter")}
            extra={
              <Tag tone={znAllow ? "ok" : "default"}>
                {t(znAllow ? "hide.status.enabled" : "hide.status.disabled")}
              </Tag>
            }
          />
        ) : null}
        {znSupported ? (
          <Row
            title={t("hide.status.zygiskBase")}
            extra={
              <Tag tone={isFlagOn(status.zygisk_loader_ok) ? "ok" : "warn"}>
                {status.zygisk_loader_label ||
                  status.zygisk_loader ||
                  t("hide.status.notDetected")}
              </Tag>
            }
          />
        ) : null}
        {znSupported && isFlagOn(status.zn_hide_zn_module) ? (
          <Row
            title={t("hide.status.znPath")}
            extra={<Tag tone="ok">{t("hide.status.declared")}</Tag>}
          />
        ) : null}
      </ListGroup>
    </Card>
  );
}
