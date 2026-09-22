import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectCustomCertificates } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { useCertDetail } from "@/features/certs/hooks/useCertDetail";
import type { AppPresetKind } from "@/shared/api/cli";
import { Switch } from "@/shared/ui/primitives";
import { CertDetailSheet } from "@/features/certs/ui/CertDetailSheet";
import { HotMountPanel } from "@/features/certs/ui/HotMountPanel";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

const PRESET_KINDS: AppPresetKind[] = [
  "httpcanary",
  "adguard",
  "charles",
  "mitmproxy",
  "pcapdroid",
];

function stateOf(cert: { isActive: boolean; isEnabled: boolean; isAvailable: boolean }) {
  if (cert.isActive) return "active";
  if (cert.isEnabled) return "pending";
  if (cert.isAvailable) return "ready";
  return "missing";
}

export function ConsoleCertsPage() {
  const chrome = usePackChrome();
  const dispatch = useAppDispatch();
  const customs = useAppSelector(selectCustomCertificates);
  const builtins = useBuiltinCerts();
  const detail = useCertDetail();
  const v = chrome.certs;
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

  return (
    <div className="pk-con-page">
      <pre className="pk-con-banner">{`# ${v.title}
# ${v.sub}`}</pre>

      <section className="pk-con-block">
        <div className="pk-con-block__head">{v.builtin}</div>
        <table className="pk-con-table">
          <thead>
            <tr>
              <th>name</th>
              <th>state</th>
              <th>info</th>
              <th>sw</th>
            </tr>
          </thead>
          <tbody>
            {builtins.map((cert) => (
              <tr key={cert.kind}>
                <td>{cert.title}</td>
                <td>{stateOf(cert)}</td>
                <td>
                  <button
                    type="button"
                    className="pk-con-link"
                    disabled={!(cert.isAvailable || cert.isActive)}
                    onClick={() => void detail.openDetail(cert.kind, cert.title)}
                  >
                    i
                  </button>
                </td>
                <td>
                  <Switch
                    checked={cert.isEnabled}
                    onChange={(next) => void handleToggleBuiltin(cert.kind, next)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pk-con-block">
        <div className="pk-con-block__head">
          {v.custom} [{customs.length}]
        </div>
        <div className="pk-con-actions">
          <label className="pk-con-btn is-primary pk-con-file">
            + {v.import}
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
          <button
            type="button"
            className="pk-con-btn"
            disabled={isPending}
            onClick={() => void handleExportFingerprints()}
          >
            fps
          </button>
        </div>
        {customs.length ? (
          <table className="pk-con-table">
            <tbody>
              {customs.map((c) => (
                <tr key={c.name}>
                  <td>{c.display || c.name}</td>
                  <td>
                    <button
                      type="button"
                      className="pk-con-link"
                      onClick={() =>
                        void detail.openDetail(`custom:${c.name}`, c.display || c.name)
                      }
                    >
                      i
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="pk-con-link"
                      disabled={isPending}
                      onClick={() => handleRemoveCustom(c.name)}
                    >
                      rm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="pk-con-pre">{v.empty}</pre>
        )}
        <div className="pk-con-actions">
          {PRESET_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="pk-con-btn"
              disabled={isPending}
              onClick={() => handleImportPreset(kind)}
            >
              {kind}
            </button>
          ))}
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
        className="pk-con-btn"
        onClick={() => void dispatch(refreshStatus(true))}
      >
        $ {v.refresh}
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
