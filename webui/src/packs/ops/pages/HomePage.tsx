import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { TrustTone } from "@/entities/module/enums";
import { confirmAction } from "@/shared/lib/confirmAction";
import { rebootDevice } from "@/shared/api/cli";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function OpsHomePage() {
  const chrome = usePackChrome();
  const dispatch = useAppDispatch();
  const overview = useTrustOverview();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const v = chrome.home;

  const title = overview.trust.title || "";
  const stabilizing =
    overview.trust.tone === TrustTone.Idle &&
    (/Stable|Inject|Check|Boot|Pending/.test(title) ||
      title.includes("\u2728") ||
      title.includes("\u{1F50D}"));

  useEffect(() => {
    if (!bootstrapped || !stabilizing) return;
    const timers = [2500, 8000].map((ms) =>
      window.setTimeout(() => {
        void dispatch(refreshStatus({ toast: false, syncApps: false, live: true }));
      }, ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [bootstrapped, stabilizing, dispatch]);

  const tone = overview.trust.tone;

  return (
    <div className="pk-ops-page pk-ops-page--home">
      {overview.isDisabled ? (
        <div className="pk-ops-alert">模块已停用，证书注入不会执行。</div>
      ) : null}
      {overview.isPendingReboot ? (
        <div className="pk-ops-alert">有永久变更等待重启后生效。</div>
      ) : null}

      <section className={`pk-ops-status tone-${tone}`}>
        <p className="pk-ops-status__eye">{v.eyebrow}</p>
        <h1 className="pk-ops-status__title">{overview.trust.title}</h1>
        <div className="pk-ops-status__metrics">
          <span>
            <strong>{overview.activeCount}</strong>
            {v.metrics.active}
          </span>
          <span>
            <strong>{overview.customCount}</strong>
            {v.metrics.custom}
          </span>
          <span>
            <strong>{overview.baselineCount}</strong>
            {v.metrics.baseline}
          </span>
        </div>
        <div className="pk-ops-actions">
          <button
            type="button"
            className="pk-ops-btn is-primary"
            onClick={() => void dispatch(refreshStatus(true))}
          >
            {v.refresh}
          </button>
          <button
            type="button"
            className="pk-ops-btn"
            onClick={() =>
              confirmAction({
                title: "确认重启设备？",
                content: "重启后应用永久证书变更并清理临时层。",
                okText: v.reboot,
                danger: true,
                onOk: () => rebootDevice(),
              })
            }
          >
            {v.reboot}
          </button>
        </div>
      </section>

      <section className="pk-ops-panel">
        <h2 className="pk-ops-panel__title">{v.pipeline}</h2>
        <div className="pk-ops-list">
          {overview.builtinPipeline.map((row) => (
            <div
              key={row.kind}
              className={`pk-ops-list__row${row.active ? " is-on" : ""}`}
            >
              <div>
                <strong>{row.title}</strong>
                <span>{row.stateLabel}</span>
              </div>
              <code>
                {row.enabled ? "on" : "off"}/{row.active ? "live" : "idle"}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section className="pk-ops-panel">
        <h2 className="pk-ops-panel__title">{v.env}</h2>
        <dl className="pk-ops-kv">
          <div>
            <dt>设备</dt>
            <dd>{overview.deviceName}</dd>
          </div>
          <div>
            <dt>系统</dt>
            <dd>{overview.androidLabel}</dd>
          </div>
          <div>
            <dt>Root</dt>
            <dd>{overview.rootLabel}</dd>
          </div>
          <div>
            <dt>注入</dt>
            <dd>{overview.apexLabel}</dd>
          </div>
          <div>
            <dt>挂载</dt>
            <dd>{overview.mountModeLabel}</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd>{overview.versionLabel}</dd>
          </div>
          <div>
            <dt>刷新</dt>
            <dd>{overview.lastRefreshedAt}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
