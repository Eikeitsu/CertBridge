import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { useAppSelector } from "@/app/store/hooks";
import { selectDeviceName, selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { parseEnum } from "@/shared/lib/enum";
import { Experimental14System } from "@/entities/module/enums";
import { EXPERIMENTAL_14_SYSTEM } from "@/shared/config/mount";

function yesNo(flag: string | undefined, fallbackInstalled?: boolean) {
  if (flag === "1" || flag === "0") return flag === "1" ? "已安装" : "未安装";
  if (fallbackInstalled !== undefined) return fallbackInstalled ? "已安装" : "未安装";
  return EMPTY_PLACEHOLDER;
}

type AboutRow = {
  key: string;
  label: string;
  value: string;
  group: "env" | "config" | "component";
};

export function useAboutModuleRows(): AboutRow[] {
  const status = useAppSelector(selectModuleStatus);
  const deviceName = useAppSelector(selectDeviceName);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  const modeLabel =
    status.profile_install_mode === "default"
      ? "默认安装"
      : status.profile_install_mode === "custom"
        ? "自定义安装"
        : status.profile_install_mode || EMPTY_PLACEHOLDER;

  const e14 = parseEnum(
    Experimental14System,
    status.experimental_14_system,
    Experimental14System.Skip,
  );

  return [
    {
      key: "version",
      label: "版本",
      value: status.version || EMPTY_PLACEHOLDER,
      group: "env",
    },
    {
      key: "device",
      label: "设备",
      value: deviceName || EMPTY_PLACEHOLDER,
      group: "env",
    },
    { key: "system", label: "系统", value: androidLabel, group: "env" },
    {
      key: "root",
      label: "Root",
      value: status.root || EMPTY_PLACEHOLDER,
      group: "env",
    },
    {
      key: "mount",
      label: "挂载模式",
      value: status.mount_mode || EMPTY_PLACEHOLDER,
      group: "config",
    },
    {
      key: "e14",
      label: "14+ system",
      value: EXPERIMENTAL_14_SYSTEM[e14].label,
      group: "config",
    },
    {
      key: "tmpfs",
      label: "临时路径",
      value: status.tmpfs_style || EMPTY_PLACEHOLDER,
      group: "config",
    },
    { key: "mode", label: "安装方案", value: modeLabel, group: "config" },
    {
      key: "webui",
      label: "WebUI 组件",
      value: yesNo(status.profile_webui, true),
      group: "component",
    },
    {
      key: "hot",
      label: "热挂载组件",
      value: yesNo(status.profile_hot, isFlagOn(status.hot_supported)),
      group: "component",
    },
    {
      key: "hide",
      label: "挂载隐藏协助",
      value: yesNo(status.profile_hide_assist, isFlagOn(status.hide_supported)),
      group: "component",
    },
    {
      key: "zn",
      label: "Zygisk 挂载过滤",
      value: yesNo(status.profile_zn_hide, isFlagOn(status.zn_hide_supported)),
      group: "component",
    },
  ];
}

function toneOf(value: string): "ok" | "off" | "neutral" {
  if (value === "已安装") return "ok";
  if (value === "未安装") return "off";
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
  const rows = useAboutModuleRows();
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
      "# env",
      ...groupRows(rows, "env").map((row) => `${row.key}=${row.value}`),
      "# config",
      ...groupRows(rows, "config").map((row) => `${row.key}=${row.value}`),
      "# components",
      ...groupRows(rows, "component").map((row) => `${row.key}=${row.value}`),
    ];
    return <pre className="bf-about-shell">{lines.join("\n")}</pre>;
  }

  if (resolved === "rail") {
    return (
      <div className="bf-about-rail">
        {(
          [
            { id: "env", title: "环境", items: groupRows(rows, "env") },
            { id: "config", title: "配置", items: groupRows(rows, "config") },
            {
              id: "component",
              title: "组件",
              items: groupRows(rows, "component"),
            },
          ] as const
        ).map((section) => (
          <section key={section.id} className="bf-about-rail__section">
            <div className="bf-about-rail__label">{section.title}</div>
            <div className="bf-about-rail__grid">
              {section.items.map((row) => {
                const tone = toneOf(row.value);
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
        <div className="bf-about-tiles__head">运行环境</div>
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
        <div className="bf-about-tiles__head">配置</div>
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
        <div className="bf-about-tiles__head">组件状态</div>
        <div className="bf-about-tiles__status">
          {groupRows(rows, "component").map((row) => {
            const tone = toneOf(row.value);
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
