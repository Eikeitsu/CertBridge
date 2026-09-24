import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { TrustTone } from "@/entities/module/enums";
import { confirmAction } from "@/shared/lib/confirmAction";
import { rebootDevice } from "@/shared/api/cli";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function DefaultHomePage() {
  const { t } = useTranslation("webui");
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

  const desc =
    overview.injectDiagnosis?.hint ||
    (overview.activeNames.length
      ? overview.activeNames.join(" · ")
      : overview.trust.hint || overview.description || v.empty);

  const metrics = [
    { label: v.metrics.active, value: overview.activeCount },
    { label: v.metrics.custom, value: overview.customCount },
    { label: v.metrics.baseline, value: overview.baselineCount },
  ];

  return (
    <div className={`pk-def-page pk-def-page--home tone-${overview.trust.tone}`}>
      {overview.isDisabled ? (
        <div className="pk-def-banner is-warn">{t("overview.moduleDisabled")}</div>
      ) : null}
      {overview.isPendingReboot ? (
        <div className="pk-def-banner is-warn">{t("overview.pendingReboot")}</div>
      ) : null}
      {overview.injectDiagnosis?.message ? (
        <div className="pk-def-banner is-bad">
          {overview.injectDiagnosis.message}
          {overview.injectDiagnosis.hint ? ` · ${overview.injectDiagnosis.hint}` : ""}
        </div>
      ) : null}

      <section className={`pk-def-stage tone-${overview.trust.tone}`}>
        <p className="pk-def-stage__eye">{v.eyebrow}</p>
        <div className="pk-def-stage__main">
          <h1 className="pk-def-stage__title">{overview.trust.title}</h1>
          <p className="pk-def-stage__count">
            <strong>{overview.activeCount}</strong>
            <span>{t("overview.activeCountSuffix")}</span>
          </p>
        </div>
        <p className="pk-def-stage__desc">{desc}</p>
        <div className="pk-def-stage__actions">
          <button
            type="button"
            className="pk-def-btn is-primary"
            onClick={() => void dispatch(refreshStatus(true))}
          >
            {v.refresh}
          </button>
          <button
            type="button"
            className="pk-def-btn is-ghost"
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
            {v.reboot}
          </button>
        </div>
      </section>

      <p className="pk-def-inline-stats" aria-label={t("overview.metricsAria")}>
        {metrics.map((m, i) => (
          <span key={m.label}>
            {i > 0 ? (
              <span className="pk-def-inline-stats__sep" aria-hidden>
                ·
              </span>
            ) : null}
            <strong>{m.value}</strong> {m.label}
          </span>
        ))}
      </p>

      <section className="pk-def-section">
        <h2 className="pk-def-section__title">{v.pipeline}</h2>
        <div className="pk-def-group">
          {overview.builtinPipeline.map((row) => (
            <div key={row.kind} className={`pk-def-row${row.active ? " is-on" : ""}`}>
              <div className="pk-def-row__main">
                <strong>{row.title}</strong>
                <span>{row.stateLabel}</span>
              </div>
              <span className={`pk-def-dot${row.active ? " is-on" : ""}`} aria-hidden />
            </div>
          ))}
        </div>
      </section>

      <details className="pk-def-fold">
        <summary>{v.env}</summary>
        <dl className="pk-def-kv">
          <div>
            <dt>{t("overview.envDevice")}</dt>
            <dd>{overview.deviceName}</dd>
          </div>
          <div>
            <dt>{t("overview.envSystem")}</dt>
            <dd>{overview.androidLabel}</dd>
          </div>
          <div>
            <dt>Root</dt>
            <dd>{overview.rootLabel}</dd>
          </div>
          <div>
            <dt>{t("overview.envInject")}</dt>
            <dd>{overview.apexLabel}</dd>
          </div>
          <div>
            <dt>{t("overview.envMount")}</dt>
            <dd>{overview.mountModeLabel}</dd>
          </div>
          <div>
            <dt>{t("overview.envVersion")}</dt>
            <dd>{overview.versionLabel}</dd>
          </div>
        </dl>
        <p className="pk-def-muted">
          {t("overview.lastRefresh", { time: overview.lastRefreshedAt })}
        </p>
      </details>
    </div>
  );
}
