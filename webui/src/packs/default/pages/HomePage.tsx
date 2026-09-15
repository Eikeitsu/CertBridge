import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { TrustTone } from "@/entities/module/enums";
import { confirmAction } from "@/shared/lib/confirmAction";
import { rebootDevice } from "@/shared/api/cli";
import { Loader } from "@/shared/ui/Loader";
import { DEFAULT_VOICE } from "../voice";

export function DefaultHomePage() {
  const dispatch = useAppDispatch();
  const overview = useTrustOverview();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const v = DEFAULT_VOICE.home;
  const showBoot = overview.isLoading && !bootstrapped;

  const stabilizing =
    overview.trust.tone === TrustTone.Idle &&
    /稳定中|注入中|检测中/.test(overview.trust.title);

  useEffect(() => {
    if (!bootstrapped || !stabilizing) return;
    const timers = [2500, 8000].map((ms) =>
      window.setTimeout(() => {
        void dispatch(refreshStatus({ toast: false, syncApps: false, live: true }));
      }, ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [bootstrapped, stabilizing, dispatch]);

  const desc =
    overview.injectDiagnosis?.hint ||
    (overview.activeNames.length
      ? overview.activeNames.join(" · ")
      : overview.trust.hint || overview.description || v.empty);

  const metrics = useMemo(
    () => [
      { label: v.metrics.active, value: overview.activeCount },
      { label: v.metrics.custom, value: overview.customCount },
      { label: v.metrics.baseline, value: overview.baselineCount },
    ],
    [overview, v],
  );

  if (showBoot) return <Loader label={DEFAULT_VOICE.loading} />;

  return (
    <div className="pk-def-page">
      {overview.isDisabled ? (
        <div className="pk-def-banner is-warn">模块已停用，证书注入不会执行。</div>
      ) : null}
      {overview.isPendingReboot ? (
        <div className="pk-def-banner is-warn">有永久变更等待重启后生效。</div>
      ) : null}
      {overview.injectDiagnosis?.message ? (
        <div className="pk-def-banner is-bad">
          {overview.injectDiagnosis.message}
          {overview.injectDiagnosis.hint ? ` · ${overview.injectDiagnosis.hint}` : ""}
        </div>
      ) : null}

      <section className={`pk-def-hero tone-${overview.trust.tone}`}>
        <p className="pk-def-hero__eye">{v.eyebrow}</p>
        <div className="pk-def-hero__row">
          <div>
            <h1 className="pk-def-hero__title">{overview.trust.title}</h1>
            <p className="pk-def-hero__desc">{desc}</p>
          </div>
          <div className="pk-def-hero__count" aria-label="生效证书数">
            <strong>{overview.activeCount}</strong>
            <span>张生效</span>
          </div>
        </div>
        <div className="pk-def-hero__actions">
          <button
            type="button"
            className="pk-def-btn is-primary"
            onClick={() => void dispatch(refreshStatus(true))}
          >
            {v.refresh}
          </button>
          <button
            type="button"
            className="pk-def-btn"
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

      <div className="pk-def-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="pk-def-metric">
            <strong>{m.value}</strong>
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      <section className="pk-def-block">
        <h2>{v.pipeline}</h2>
        <div className="pk-def-ca-grid">
          {overview.builtinPipeline.map((row) => (
            <article key={row.kind} className={`pk-def-ca${row.active ? " is-on" : ""}`}>
              <strong>{row.title}</strong>
              <span>{row.stateLabel}</span>
            </article>
          ))}
        </div>
      </section>

      <details className="pk-def-details">
        <summary>{v.env}</summary>
        <dl className="pk-def-kv">
          <div>
            <dt>设备</dt>
            <dd>{overview.deviceLabel}</dd>
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
        </dl>
        <p className="pk-def-muted">上次刷新 {overview.lastRefreshedAt}</p>
      </details>
    </div>
  );
}
