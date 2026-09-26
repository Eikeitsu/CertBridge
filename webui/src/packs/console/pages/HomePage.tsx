import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { useStabilizingRefresh } from "@/features/overview/hooks/useStabilizingRefresh";
import { confirmAction } from "@/shared/lib/confirmAction";
import { rebootDevice } from "@/shared/api/cli";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function ConsoleHomePage() {
  const { t } = useTranslation("webui");
  const chrome = usePackChrome();
  const dispatch = useAppDispatch();
  const overview = useTrustOverview();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const v = chrome.home;

  useStabilizingRefresh(bootstrapped, overview.trust.title || "", overview.trust.tone);

  const tone = overview.trust.tone;

  return (
    <div className="pk-con-page">
      <pre className="pk-con-banner">
        {`# ${v.eyebrow}
status=${tone}
title=${overview.trust.title}
active=${overview.activeCount} custom=${overview.customCount} base=${overview.baselineCount}
disabled=${overview.isDisabled ? 1 : 0} reboot_pending=${overview.isPendingReboot ? 1 : 0}`}
      </pre>

      <div className="pk-con-actions">
        <button
          type="button"
          className="pk-con-btn is-primary"
          onClick={() => void dispatch(refreshStatus(true))}
        >
          $ {v.refresh}
        </button>
        <button
          type="button"
          className="pk-con-btn"
          onClick={() =>
            confirmAction({
              title: t("overview.rebootConfirmTitle"),
              content: t("overview.rebootConfirmBody"),
              okText: v.reboot,
              danger: true,
              onOk: () => rebootDevice(),
            })
          }
        >
          $ {v.reboot}
        </button>
      </div>

      <section className="pk-con-block">
        <div className="pk-con-block__head">{v.pipeline}</div>
        <table className="pk-con-table">
          <thead>
            <tr>
              <th>name</th>
              <th>state</th>
              <th>en</th>
              <th>on</th>
            </tr>
          </thead>
          <tbody>
            {overview.builtinPipeline.map((row) => (
              <tr key={row.kind}>
                <td>{row.title}</td>
                <td>{row.stateLabel}</td>
                <td>{row.enabled ? "1" : "0"}</td>
                <td>{row.active ? "1" : "0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pk-con-block">
        <div className="pk-con-block__head">{v.env}</div>
        <pre className="pk-con-pre">{`device=${overview.deviceName}
android=${overview.androidLabel}
root=${overview.rootLabel}
inject=${overview.apexLabel}
mount=${overview.mountModeLabel}
version=${overview.versionLabel}
refreshed=${overview.lastRefreshedAt}`}</pre>
      </section>
    </div>
  );
}
