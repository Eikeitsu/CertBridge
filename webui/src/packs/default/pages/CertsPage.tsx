import { refreshStatus } from "@/features/status/model/statusSlice";
import { useCertsPageModel } from "@/features/certs/hooks/useCertsPageModel";
import { CERT_IMPORT_ACCEPT_ATTR } from "@/shared/config/certs";
import { Switch } from "@/shared/ui/primitives";
import { CertDetailSheet } from "@/features/certs/ui/CertDetailSheet";
import { HotMountPanel } from "@/features/certs/ui/HotMountPanel";

export function DefaultCertsPage() {
  const {
    t,
    dispatch,
    customs,
    builtins,
    detail,
    v,
    statusLabel,
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
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>{v.sub}</p>
      </header>

      <section className="pk-def-section">
        <h2 className="pk-def-section__title">{v.builtin}</h2>
        <div className="pk-def-group">
          {builtins.map((cert) => (
            <div key={cert.kind} className={`pk-def-row${cert.isActive ? " is-on" : ""}`}>
              <div className="pk-def-row__main">
                <strong>{cert.title}</strong>
                <span>{statusLabel(cert)}</span>
              </div>
              <div className="pk-def-row__ops">
                <button
                  type="button"
                  className="pk-def-link"
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

      <section className="pk-def-section">
        <div className="pk-def-section__bar">
          <h2 className="pk-def-section__title">
            {v.custom} · {customs.length}
          </h2>
          <label
            className={`pk-def-btn is-primary pk-def-file${isPending ? " is-disabled" : ""}${isImporting ? " bf-btn--busy" : ""}`}
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
        <div className="pk-def-group">
          {customs.length ? (
            customs.map((c) => (
              <div key={c.name} className="pk-def-row">
                <div className="pk-def-row__main">
                  <strong>{c.display || c.name}</strong>
                  <span>{c.name}</span>
                </div>
                <div className="pk-def-row__ops">
                  <button
                    type="button"
                    className="pk-def-link"
                    onClick={() =>
                      void detail.openDetail(`custom:${c.name}`, c.display || c.name)
                    }
                  >
                    {t("ui.detail")}
                  </button>
                  <button
                    type="button"
                    className="pk-def-link is-danger"
                    disabled={isPending}
                    onClick={() => handleRemoveCustom(c.name)}
                  >
                    {t("ui.delete")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="pk-def-empty">{v.empty}</p>
          )}
        </div>
        <div className="pk-def-presets">
          {PRESET_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="pk-def-chip"
              disabled={isPending}
              onClick={() => handleImportPreset(kind)}
            >
              {kind}
            </button>
          ))}
          <button
            type="button"
            className="pk-def-chip"
            disabled={isPending}
            onClick={() => void handleExportFingerprints()}
          >
            {t("ui.copyFps")}
          </button>
        </div>
      </section>

      <details className="pk-def-fold">
        <summary>{v.hot}</summary>
        <div style={{ marginTop: 8 }}>
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
        className="pk-def-btn is-ghost"
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
