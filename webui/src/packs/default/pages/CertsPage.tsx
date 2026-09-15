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
import { DEFAULT_VOICE } from "../voice";

const PRESET_KINDS: AppPresetKind[] = [
  "httpcanary",
  "adguard",
  "charles",
  "mitmproxy",
  "pcapdroid",
];

export function DefaultCertsPage() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectStatusLoading);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const customs = useAppSelector(selectCustomCertificates);
  const builtins = useBuiltinCerts();
  const detail = useCertDetail();
  const v = DEFAULT_VOICE.certs;
  const {
    isPending,
    pendingKind,
    handleToggleBuiltin,
    handleImportFile,
    handleImportPreset,
    handleExportFingerprints,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  } = useCertActions();

  if (loading && !bootstrapped) return <Loader label={DEFAULT_VOICE.loading} />;

  return (
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>{v.sub}</p>
      </header>

      <section className="pk-def-block">
        <h2>{v.builtin}</h2>
        <div className="pk-def-cert-cards">
          {builtins.map((cert) => (
            <article key={cert.kind} className="pk-def-cert-card">
              <div>
                <strong>{cert.title}</strong>
                <p>
                  {cert.isActive
                    ? "已生效"
                    : cert.isEnabled
                      ? "待重启"
                      : cert.isAvailable
                        ? "可用"
                        : "未检测到"}
                </p>
              </div>
              <div className="pk-def-cert-card__ops">
                <button
                  type="button"
                  className="pk-def-link"
                  disabled={!(cert.isAvailable || cert.isActive)}
                  onClick={() => void detail.openDetail(cert.kind, cert.title)}
                >
                  详情
                </button>
                <Switch
                  checked={cert.isEnabled}
                  disabled={isPending && pendingKind === cert.kind}
                  onChange={(next) => void handleToggleBuiltin(cert.kind, next)}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pk-def-block">
        <div className="pk-def-block__bar">
          <h2>
            {v.custom} ({customs.length})
          </h2>
          <label className="pk-def-btn is-primary pk-def-file">
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
        {customs.length ? (
          <ul className="pk-def-list">
            {customs.map((c) => (
              <li key={c.name}>
                <div>
                  <strong>{c.display || c.name}</strong>
                  <span>{c.name}</span>
                </div>
                <div className="pk-def-list__ops">
                  <button
                    type="button"
                    className="pk-def-link"
                    onClick={() => void detail.openDetail(`custom:${c.name}`, c.display || c.name)}
                  >
                    详情
                  </button>
                  <button
                    type="button"
                    className="pk-def-link is-danger"
                    disabled={isPending}
                    onClick={() => handleRemoveCustom(c.name)}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pk-def-empty">{v.empty}</p>
        )}
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
            复制指纹
          </button>
        </div>
      </section>

      <HotMountPanel
        busy={isPending}
        title={v.hot}
        onSetHotAllow={(checked) => void handleSetHotAllow(checked)}
        onMount={handleHotMount}
        onUnmount={handleHotUnmount}
      />

      <button
        type="button"
        className="pk-def-btn"
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
