import type { CustomCertificate } from "@/entities/module/types";
import { Card, ListGroup, Row, Button } from "@/shared/ui/primitives";
import { CertImportButton } from "./CertImportButton";

type CustomCertsPanelProps = {
  certificates: CustomCertificate[];
  isPending: boolean;
  onImport: (file: File) => void | Promise<unknown>;
  onRemove: (name: string) => void;
};

export function CustomCertsPanel({
  certificates,
  isPending,
  onImport,
  onRemove,
}: CustomCertsPanelProps) {
  return (
    <Card title={`自定义证书 (${certificates.length})`}>
      <ListGroup>
        {certificates.length ? (
          certificates.map((cert) => (
            <Row
              key={cert.name}
              title={cert.display || cert.name}
              desc={cert.name}
              extra={
                <Button variant="ghost" disabled={isPending} onClick={() => onRemove(cert.name)}>
                  删除
                </Button>
              }
            />
          ))
        ) : (
          <div className="cb-empty">暂无自定义证书</div>
        )}
      </ListGroup>
      <div style={{ marginTop: 12 }}>
        <CertImportButton disabled={isPending} onImport={onImport} />
      </div>
    </Card>
  );
}
