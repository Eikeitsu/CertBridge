import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { HIDE_PROVIDER_LABELS, TMPFS_STYLES } from "@/shared/config/mount";
import { parseEnum } from "@/shared/lib/enum";
import { MountMode, TmpfsStyle } from "@/entities/module/enums";
import { Card } from "@/shared/ui/primitives";

type HideStatusCardProps = {
  variant?: "list" | "table";
  title?: string;
};

type Tone = "ok" | "warn" | "off" | "neutral";

type StatusItem = {
  id: string;
  label: string;
  value: string;
  tone: Tone;
};

type KvItem = {
  id: string;
  label: string;
  value: string;
  /** 长文案用上下结构，避免挤成一团 */
  layout?: "row" | "stack";
  tone?: Tone;
};

function toneClass(tone: Tone | undefined) {
  if (tone === "ok") return "is-ok";
  if (tone === "warn") return "is-warn";
  if (tone === "off") return "is-off";
  return "is-neutral";
}

export function HideStatusCard({ variant = "list", title }: HideStatusCardProps) {
  const { t } = useTranslation("webui");
  const status = useAppSelector(selectModuleStatus);
  const mountMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);
  const tmpfsStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Dev);
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

  const assistants = useMemo((): StatusItem[] => {
    const labelOf = (id: string) => {
      const key = HIDE_PROVIDER_LABELS[id];
      return key ? t(key) : id;
    };
    const seen = new Set<string>();
    const items: StatusItem[] = [];
    const push = (id: string, label: string, value: string, tone: Tone) => {
      if (seen.has(id)) return;
      seen.add(id);
      items.push({ id, label, value, tone });
    };

    // 细项优先（更准的状态文案）；CSV / 底座补齐其余，互不挡路
    if (hideSusfs) {
      push("susfs", labelOf("susfs"), t("hide.status.susfsReady"), "ok");
    }
    if (hideNohello) {
      push("nohello", labelOf("nohello"), t("hide.status.noHelloPointReady"), "ok");
    }
    if (hideKsud) {
      push("ksud", labelOf("ksud"), t("hide.status.detected"), "ok");
    }
    if (hideKuFeat) {
      push("kernel_umount", "kernel_umount", t("hide.status.kernelUmountOn"), "ok");
    } else if (hideKsud || (status.root || "").includes("Kernel")) {
      push(
        "kernel_umount",
        "kernel_umount",
        t("hide.status.kernelUmountWarning"),
        "warn",
      );
    }

    const csv = (status.hide_assistants || "").trim();
    if (csv && csv !== "none") {
      for (const id of csv.split(",")) {
        const key = id.trim();
        if (!key || key === "none") continue;
        push(key, labelOf(key), t("hide.status.detected"), "ok");
      }
    }

    const loader = status.zygisk_loader || "";
    if (loader && loader !== "none") {
      const loaderOk = isFlagOn(status.zygisk_loader_ok);
      push(
        loader,
        status.zygisk_loader_label || labelOf(loader),
        t("hide.status.detected"),
        loaderOk ? "ok" : "warn",
      );
    }

    if (items.length === 0) {
      items.push({
        id: "none",
        label: t("hide.status.assistants"),
        value: status.hide_assistants_label || t("hide.status.notDetected"),
        tone: "off",
      });
    }
    return items;
  }, [
    status.hide_assistants,
    status.hide_assistants_label,
    status.zygisk_loader,
    status.zygisk_loader_label,
    status.zygisk_loader_ok,
    status.root,
    hideSusfs,
    hideNohello,
    hideKsud,
    hideKuFeat,
    t,
  ]);

  const pathList = (status.hide_try_umount_paths || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const mountItems: KvItem[] = [
    { id: "root", label: t("hide.status.root"), value: status.root || "—" },
    { id: "mount", label: t("hide.status.mount"), value: mountModeLabel },
    {
      id: "stage",
      label: t("hide.status.stagePath"),
      value: status.stage_root || TMPFS_STYLES[tmpfsStyle].paths[0],
      layout: "stack",
    },
    { id: "style", label: t("hide.status.pathStyle"), value: tmpfsStyleLabel },
  ];

  const injectItems: KvItem[] = [
    {
      id: "force",
      label: t("hide.status.forceBind"),
      value: t(forceBind ? "hide.status.forceBindOn" : "hide.status.forceBindOff"),
      tone: forceBind ? "warn" : "ok",
    },
    {
      id: "late",
      label: t("hide.status.lateInject"),
      value: t(lateInject ? "hide.status.lateInjectOn" : "hide.status.lateInjectOff"),
      tone: lateInject ? "warn" : "ok",
    },
    {
      id: "zygote",
      label: t("hide.status.bootZygote"),
      value: t(bootZygote ? "hide.status.bootZygoteOn" : "hide.status.bootZygoteOff"),
      tone: bootZygote ? "ok" : "warn",
    },
    {
      id: "targets",
      label: t("hide.status.bootTargets"),
      value: t(multiApex ? "hide.status.bootTargetsOn" : "hide.status.bootTargetsOff"),
      tone: multiApex ? "ok" : "warn",
    },
    {
      id: "probe",
      label: t("hide.status.serviceProbe"),
      value: t(
        serviceProbe ? "hide.status.serviceProbeOn" : "hide.status.serviceProbeOff",
      ),
      tone: serviceProbe ? "ok" : "warn",
    },
  ];

  const registerItems: KvItem[] = [
    {
      id: "try",
      label: t("hide.status.tryUmount"),
      value: tryUmountLabel,
      tone: hideApplied ? "ok" : canRegister ? "warn" : "off",
    },
  ];
  if (pathList.length) {
    registerItems.push({
      id: "paths",
      label: t("hide.status.registeredPaths"),
      value: pathList.join("\n"),
      layout: "stack",
    });
  }

  const zygiskItems: KvItem[] = [];
  if (znSupported) {
    zygiskItems.push({
      id: "filter",
      label: t("hide.status.zygiskFilter"),
      value: t(znAllow ? "hide.status.enabled" : "hide.status.disabled"),
      tone: znAllow ? "ok" : "off",
    });
    if (isFlagOn(status.zn_hide_zn_module)) {
      zygiskItems.push({
        id: "zn",
        label: t("hide.status.znPath"),
        value: t("hide.status.declared"),
        tone: "ok",
      });
    }
  }

  const tableRows: { k: string; v: string }[] = [
    ...mountItems.map((i) => ({ k: i.label, v: i.value })),
    ...injectItems.map((i) => ({ k: i.label, v: i.value })),
    ...assistants.map((i) => ({ k: i.label, v: i.value })),
    ...registerItems.map((i) => ({ k: i.label, v: i.value })),
    ...zygiskItems.map((i) => ({ k: i.label, v: i.value })),
  ];

  if (variant === "table") {
    return (
      <Card title={title ?? t("hide.status.title")} meta={meta}>
        <table className="bf-table">
          <tbody>
            {tableRows.map((row) => (
              <tr key={`${row.k}:${row.v}`}>
                <td>{row.k}</td>
                <td style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {row.v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  return (
    <Card title={title ?? t("hide.status.title")} meta={meta}>
      <div className="bf-hide-status">
        <section className="bf-hide-status__block">
          <div className="bf-hide-status__head">{t("hide.status.groups.mount")}</div>
          <div className="bf-hide-status__metrics">
            {mountItems.map((item) => (
              <div
                key={item.id}
                className={`bf-hide-status__metric${item.layout === "stack" ? " is-wide" : ""}`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="bf-hide-status__block">
          <div className="bf-hide-status__head">{t("hide.status.groups.inject")}</div>
          <div className="bf-hide-status__stack">
            {injectItems.map((item) => (
              <div
                key={item.id}
                className={`bf-hide-status__row ${toneClass(item.tone)}`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="bf-hide-status__block">
          <div className="bf-hide-status__head">{t("hide.status.groups.assistants")}</div>
          <div className="bf-hide-status__assistants">
            {assistants.map((item) => (
              <div
                key={item.id}
                className={`bf-hide-status__chip ${toneClass(item.tone)}`}
              >
                <span className="bf-hide-status__dot" aria-hidden />
                <div>
                  <strong>{item.label}</strong>
                  <em>{item.value}</em>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bf-hide-status__block">
          <div className="bf-hide-status__head">{t("hide.status.groups.register")}</div>
          <div className="bf-hide-status__stack">
            {registerItems.map((item) =>
              item.layout === "stack" ? (
                <div key={item.id} className="bf-hide-status__row is-stack">
                  <span>{item.label}</span>
                  <strong className="bf-hide-status__paths">{item.value}</strong>
                </div>
              ) : (
                <div
                  key={item.id}
                  className={`bf-hide-status__row ${toneClass(item.tone)}`}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ),
            )}
          </div>
        </section>

        {zygiskItems.length ? (
          <section className="bf-hide-status__block">
            <div className="bf-hide-status__head">{t("hide.status.groups.zygisk")}</div>
            <div className="bf-hide-status__stack">
              {zygiskItems.map((item) => (
                <div
                  key={item.id}
                  className={`bf-hide-status__row ${toneClass(item.tone)}`}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Card>
  );
}
