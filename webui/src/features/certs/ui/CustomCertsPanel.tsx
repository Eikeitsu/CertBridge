import type { CustomCertificate } from "@/entities/module/types";
import type { AppPresetKind } from "@/shared/api/cli";
import { Card, ListGroup, Row, Button } from "@/shared/ui/primitives";
import { CertImportButton } from "./CertImportButton";

const PRESET_BUTTONS: { kind: AppPresetKind; label: string }[] = [
  { kind: "httpcanary", label: "HttpCanary" },
  { kind: "adguard", label: "ADGuard" },
  { kind: "charles", label: "Charles" },
  { kind: "mitmproxy", label: "mitmproxy" },
  { kind: "pcapdroid", label: "PCAPdroid" },
];

type CustomCertsPanelProps = {
  certificates: CustomCertificate[];
  isPending: boolean;
  onImport: (file: File) => void | Promise<unknown>;
  onImportPreset?: (kind: AppPresetKind) => void;
  onExportFingerprints?: () => void;
  onRemove: (name: string) => void;
  onOpenDetail: (id: string, title: string) => void;
  title?: string;
  emptyLabel?: string;
  importLabel?: string;
  detailLabel?: string;
  presetsTitle?: string;
  presetsMeta?: string;
  exportFpsLabel?: string;
};

export function CustomCertsPanel({
  certificates,
  isPending,
  onImport,
  onImportPreset,
  onExportFingerprints,
  onRemove,
  onOpenDetail,
  title,
  emptyLabel = "暂无自定义证书",
  importLabel = "导入 CA",
  detailLabel = "详情",
  presetsTitle = "从常见路径导入",
  presetsMeta,
  exportFpsLabel = "复制已应用指纹",
}: CustomCertsPanelProps) {
  return (
    <Card title={title ?? `自定义证书 (${certificates.length})`}>
      <ListGroup>
        {certificates.length ? (
          certificates.map((cert) => (
            <Row
              key={cert.name}
              title={cert.display || cert.name}
              desc={cert.name}
              extra={
                <div className="cb-btn-row" style={{ gap: 8, margin: 0 }}>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      onOpenDetail(`custom:${cert.name}`, cert.display || cert.name)
                    }
                  >
                    {detailLabel}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => onRemove(cert.name)}
                  >
                    删除
                  </Button>
                </div>
              }
            />
          ))
        ) : (
          <div className="cb-empty">{emptyLabel}</div>
        )}
      </ListGroup>
      <div style={{ marginTop: 12 }}>
        <CertImportButton disabled={isPending} onImport={onImport} label={importLabel} />
      </div>
      {onImportPreset ? (
        <div style={{ marginTop: 14 }}>
          <div className="cb-page-sub" style={{ marginBottom: 8 }}>
            {presetsTitle}
            {presetsMeta ? ` · ${presetsMeta}` : ""}
          </div>
          <div className="cb-btn-row" style={{ flexWrap: "wrap", gap: 8 }}>
            {PRESET_BUTTONS.map((p) => (
              <Button
                key={p.kind}
                variant="ghost"
                disabled={isPending}
                onClick={() => onImportPreset(p.kind)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {onExportFingerprints ? (
        <div className="cb-btn-row" style={{ marginTop: 12 }}>
          <Button variant="ghost" disabled={isPending} onClick={onExportFingerprints}>
            {exportFpsLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
