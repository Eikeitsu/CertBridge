import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
  selectStatusBootstrapped,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { useCertDetail } from "@/features/certs/hooks/useCertDetail";
import type { AppPresetKind } from "@/shared/api/cli";
import { Switch } from "@/shared/ui/primitives";
import { Loader } from "@/shared/ui/Loader";
import { CertDetailSheet } from "@/features/certs/ui/CertDetailSheet";
import { HotMountPanel } from "@/features/certs/ui/HotMountPanel";
import { OPS_VOICE } from "../voice";

const PRESET_KINDS: AppPresetKind[] = [
  "httpcanary",
  "adguard",
  "charles",
  "mitmproxy",
  "pcapdroid",
];

function stateOf(cert: { isActive: boolean; isEnabled: boolean; isAvailable: boolean }) {
  if (cert.isActive) return "已生效";
  if (cert.isEnabled) return "待重启";
  if (cert.isAvailable) return "可用";
  return "未检测到";
}

export function OpsCertsPage() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectStatusLoading);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const customs = useAppSelector(selectCustomCertificates);
  const builtins = useBuiltinCerts();
  const detail = useCertDetail();
  const v = OPS_VOICE.certs;
  const {
    isPending,
    handleToggleBuiltin,
    handleImportFile,
    handleImportPreset,
    handleExportFingerprints,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  } = useCertActions();

  if (loading && !bootstrapped) return <Loader label={OPS_VOICE.loading} />;

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
                  详情
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
          <label className="pk-ops-btn is-primary pk-ops-file">
            {v.import}
            <input
              type="file"
              accept=".pem,.crt,.cer,.der,.zip"
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
                    详情
                  </button>
                  <button
                    type="button"
                    className="pk-ops-link is-danger"
                    disabled={isPending}
                    onClick={() => handleRemoveCustom(c.name)}
                  >
                    删除
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
            复制指纹
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
