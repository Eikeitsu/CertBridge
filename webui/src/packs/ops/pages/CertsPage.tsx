import { refreshStatus } from "@/features/status/model/statusSlice";
import { useCertsPageModel } from "@/features/certs/hooks/useCertsPageModel";
import { CERT_IMPORT_ACCEPT_ATTR } from "@/shared/config/certs";
import { Switch } from "@/shared/ui/primitives";
import { CertDetailSheet } from "@/features/certs/ui/CertDetailSheet";
import { HotMountPanel } from "@/features/certs/ui/HotMountPanel";

export function OpsCertsPage() {
  const {
    t,
    dispatch,
    customs,
    builtins,
    detail,
    v,
    statusLabel: stateOf,
    presetKinds: PRESET_KINDS,
    isPending,
    isImporting,
    handleToggleBuiltin,
    handleImportFile,
    handleImportPreset,
    handleExportFingerprints,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  } = useCertsPageModel();

  return (
    <div className="pk-ops-page pk-ops-page--certs">
      <header className="pk-ops-pagehead pk-ops-pagehead--meta">
        <p>{v.sub}</p>
      </header>

      <section className="pk-ops-panel">
        <h2 className="pk-ops-panel__title">{v.builtin}</h2>
        <div className="pk-ops-list">
          {builtins.map((cert) => (
            <div
              key={cert.kind}
              className={`pk-ops-list__row${cert.isActive ? " is-on" : ""}`}
            >
              <div>
                <strong>{cert.title}</strong>
                <span>{stateOf(cert)}</span>
              </div>
              <div className="pk-ops-list__ops">
                <button
                  type="button"
                  className="pk-ops-link"
                  disabled={!(cert.isAvailable || cert.isActive)}
                  onClick={() => void detail.openDetail(cert.kind, cert.title)}
                >
                  {t("ui.detail")}
                </button>
                <Switch
                  checked={cert.isEnabled}
                  onChange={(next) => void handleToggleBuiltin(cert.kind, next)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pk-ops-panel">
        <div className="pk-ops-panel__bar">
          <h2 className="pk-ops-panel__title">
            {v.custom} · {customs.length}
          </h2>
          <label
            className={`pk-ops-btn is-primary pk-ops-file${isPending ? " is-disabled" : ""}${isImporting ? " bf-btn--busy" : ""}`}
            aria-busy={isImporting || undefined}
            style={
              isImporting
                ? { display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.92 }
                : isPending
                  ? { opacity: 0.5 }
                  : undefined
            }
          >
            {isImporting ? <span className="bf-btn__spin" aria-hidden /> : null}
            {isImporting ? v.importing : v.import}
            <input
              type="file"
              accept={CERT_IMPORT_ACCEPT_ATTR}
              hidden
              disabled={isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="pk-ops-list">
          {customs.length ? (
            customs.map((c) => (
              <div key={c.name} className="pk-ops-list__row">
                <div>
                  <strong>{c.display || c.name}</strong>
                  <span>{c.name}</span>
                </div>
                <div className="pk-ops-list__ops">
                  <button
                    type="button"
                    className="pk-ops-link"
                    onClick={() =>
                      void detail.openDetail(`custom:${c.name}`, c.display || c.name)
                    }
                  >
                    {t("ui.detail")}
                  </button>
                  <button
                    type="button"
                    className="pk-ops-link is-danger"
                    disabled={isPending}
                    onClick={() => handleRemoveCustom(c.name)}
                  >
                    {t("ui.delete")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="pk-ops-empty">{v.empty}</p>
          )}
        </div>
        <div className="pk-ops-chips">
          {PRESET_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="pk-ops-chip"
              disabled={isPending}
              onClick={() => handleImportPreset(kind)}
            >
              {kind}
            </button>
          ))}
          <button
            type="button"
            className="pk-ops-chip"
            disabled={isPending}
            onClick={() => void handleExportFingerprints()}
          >
            {t("ui.copyFps")}
          </button>
        </div>
      </section>

      <details className="pk-ops-fold">
        <summary>{v.hot}</summary>
        <div className="pk-ops-fold__body">
          <HotMountPanel
            busy={isPending}
            title={v.hot}
            surface="plain"
            hideTitle
            onSetHotAllow={(checked) => void handleSetHotAllow(checked)}
            onMount={handleHotMount}
            onUnmount={handleHotUnmount}
          />
        </div>
      </details>

      <button
        type="button"
        className="pk-ops-btn"
        onClick={() => void dispatch(refreshStatus(true))}
      >
        {v.refresh}
      </button>

      <CertDetailSheet
        open={detail.isOpen}
        title={detail.title}
        sourceId={detail.sourceId}
        fields={detail.fields}
        loading={detail.loading}
        onClose={detail.closeDetail}
      />
    </div>
  );
}
