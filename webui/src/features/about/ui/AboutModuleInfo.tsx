import { useTranslation } from "react-i18next";
import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { useAppSelector } from "@/app/store/hooks";
import { selectDeviceName, selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { parseEnum } from "@/shared/lib/enum";
import { Experimental14System, MountMode, TmpfsStyle } from "@/entities/module/enums";
import { EXPERIMENTAL_14_SYSTEM, MOUNT_MODES, TMPFS_STYLES } from "@/shared/config/mount";

function yesNo(
  flag: string | undefined,
  installed: string,
  notInstalled: string,
  fallbackInstalled?: boolean,
) {
  if (flag === "1" || flag === "0") return flag === "1" ? installed : notInstalled;
  if (fallbackInstalled !== undefined)
    return fallbackInstalled ? installed : notInstalled;
  return EMPTY_PLACEHOLDER;
}

type AboutRow = {
  key: string;
  label: string;
  value: string;
  group: "env" | "config" | "component";
};

export function useAboutModuleRows(): AboutRow[] {
  const { t } = useTranslation("webui");
  const status = useAppSelector(selectModuleStatus);
  const deviceName = useAppSelector(selectDeviceName);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  const modeLabel =
    status.profile_install_mode === "default"
      ? t("about.values.defaultInstall")
      : status.profile_install_mode === "custom"
        ? t("about.values.customInstall")
        : status.profile_install_mode || EMPTY_PLACEHOLDER;

  const e14 = parseEnum(
    Experimental14System,
    status.experimental_14_system,
    Experimental14System.Skip,
  );
  const mountMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);
  const tmpfsStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Dev);
  const installed = t("about.values.installed");
  const notInstalled = t("about.values.notInstalled");

  return [
    {
      key: "version",
      label: t("about.labels.version"),
      value: status.version || EMPTY_PLACEHOLDER,
      group: "env",
    },
    {
      key: "device",
      label: t("about.labels.device"),
      value: deviceName || EMPTY_PLACEHOLDER,
      group: "env",
    },
    {
      key: "system",
      label: t("about.labels.system"),
      value: androidLabel,
      group: "env",
    },
    {
      key: "root",
      label: "Root",
      value: status.root || EMPTY_PLACEHOLDER,
      group: "env",
    },
    {
      key: "mount",
      label: t("about.labels.mount"),
      value: t(MOUNT_MODES[mountMode].labelKey),
      group: "config",
    },
    {
      key: "e14",
      label: "14+ system",
      value: t(EXPERIMENTAL_14_SYSTEM[e14].labelKey),
      group: "config",
    },
    {
      key: "tmpfs",
      label: t("about.labels.tmpfs"),
      value: t(TMPFS_STYLES[tmpfsStyle].labelKey),
      group: "config",
    },
    {
      key: "mode",
      label: t("about.labels.installMode"),
      value: modeLabel,
      group: "config",
    },
    {
      key: "webui",
      label: t("about.labels.webui"),
      value: yesNo(status.profile_webui, installed, notInstalled, true),
      group: "component",
    },
    {
      key: "hot",
      label: t("about.labels.hot"),
      value: yesNo(
        status.profile_hot,
        installed,
        notInstalled,
        isFlagOn(status.hot_supported),
      ),
      group: "component",
    },
    {
      key: "hide",
      label: t("about.labels.hide"),
      value: yesNo(
        status.profile_hide_assist,
        installed,
        notInstalled,
        isFlagOn(status.hide_supported),
      ),
      group: "component",
    },
    {
      key: "zn",
      label: t("about.labels.zygisk"),
      value: yesNo(
        status.profile_zn_hide,
        installed,
        notInstalled,
        isFlagOn(status.zn_hide_supported),
      ),
      group: "component",
    },
  ];
}

function toneOf(
  value: string,
  installed: string,
  notInstalled: string,
): "ok" | "off" | "neutral" {
  if (value === installed) return "ok";
  if (value === notInstalled) return "off";
  return "neutral";
}

function groupRows(rows: AboutRow[], group: AboutRow["group"]) {
  return rows.filter((row) => row.group === group);
}

type AboutModuleInfoProps = {
  /** tiles=默认磁贴分组；rail=精简双列栅格；shell=终端键值 */
  variant?: "tiles" | "rail" | "shell" | "list" | "kv" | "table";
};

export function AboutModuleInfo({ variant = "tiles" }: AboutModuleInfoProps) {
  const { t } = useTranslation("webui");
  const rows = useAboutModuleRows();
  const installed = t("about.values.installed");
  const notInstalled = t("about.values.notInstalled");
  const resolved =
    variant === "list"
      ? "tiles"
      : variant === "kv"
        ? "rail"
        : variant === "table"
          ? "shell"
          : variant;

  if (resolved === "shell") {
    const lines = [
      `# ${t("about.groups.env")}`,
      ...groupRows(rows, "env").map((row) => `${row.key}=${row.value}`),
      `# ${t("about.groups.config")}`,
      ...groupRows(rows, "config").map((row) => `${row.key}=${row.value}`),
      `# ${t("about.groups.components")}`,
      ...groupRows(rows, "component").map((row) => `${row.key}=${row.value}`),
    ];
    return <pre className="bf-about-shell">{lines.join("\n")}</pre>;
  }

  if (resolved === "rail") {
    return (
      <div className="bf-about-rail">
        {(
          [
            { id: "env", title: t("about.groups.env"), items: groupRows(rows, "env") },
            {
              id: "config",
              title: t("about.groups.config"),
              items: groupRows(rows, "config"),
            },
            {
              id: "component",
              title: t("about.groups.components"),
              items: groupRows(rows, "component"),
            },
          ] as const
        ).map((section) => (
          <section key={section.id} className="bf-about-rail__section">
            <div className="bf-about-rail__label">{section.title}</div>
            <div className="bf-about-rail__grid">
              {section.items.map((row) => {
                const tone = toneOf(row.value, installed, notInstalled);
                return (
                  <div key={row.key} className={`bf-about-rail__cell is-${tone}`}>
                    <span className="bf-about-rail__key">{row.label}</span>
                    <strong className="bf-about-rail__val">{row.value}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // tiles — default dashboard
  return (
    <div className="bf-about-tiles">
      <section className="bf-about-tiles__block">
        <div className="bf-about-tiles__head">{t("about.groups.runtime")}</div>
        <div className="bf-about-tiles__metrics">
          {groupRows(rows, "env").map((row) => (
            <div key={row.key} className="bf-about-metric">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="bf-about-tiles__block">
        <div className="bf-about-tiles__head">{t("about.groups.config")}</div>
        <div className="bf-about-tiles__stack">
          {groupRows(rows, "config").map((row) => (
            <div key={row.key} className="bf-about-stack-row">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="bf-about-tiles__block">
        <div className="bf-about-tiles__head">{t("about.groups.componentStatus")}</div>
        <div className="bf-about-tiles__status">
          {groupRows(rows, "component").map((row) => {
            const tone = toneOf(row.value, installed, notInstalled);
            return (
              <div key={row.key} className={`bf-about-status is-${tone}`}>
                <span className="bf-about-status__dot" aria-hidden />
                <div>
                  <strong>{row.label}</strong>
                  <em>{row.value}</em>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
