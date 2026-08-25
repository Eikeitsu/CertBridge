import { Button, List, Space } from "antd-mobile";
import { useAppSelector } from "@/app/store/hooks";
import { selectCustomCertificates } from "@/features/status/model/selectors";
import { CERT_IMPORT_ACCEPT } from "@/shared/config/certs";
import { EmptyHint } from "@/shared/ui/EmptyHint";
import { FilePickButton } from "@/shared/ui/FilePickButton";
import { ListGroup } from "@/shared/ui/ListGroup";

type CustomCertsGroupProps = {
  title: string;
  onImport: (file: File) => void;
  onOpenDetail: (id: string, title: string) => void;
  onRemove: (name: string) => void;
};

export function CustomCertsGroup({
  title,
  onImport,
  onOpenDetail,
  onRemove,
}: CustomCertsGroupProps) {
  const customCertificates = useAppSelector(selectCustomCertificates);

  return (
    <ListGroup
      title={title}
      meta="PEM / DER / hash.0 · 校验 X.509、有效期与 CA:TRUE"
      action={
        <FilePickButton accept={CERT_IMPORT_ACCEPT.join(",")} onPick={onImport}>
          导入
        </FilePickButton>
      }
    >
      {customCertificates.length === 0 ? (
        <List.Item>
          <EmptyHint>可导入 HttpCanary、ADGuard、Charles 等 CA</EmptyHint>
        </List.Item>
      ) : (
        customCertificates.map((cert) => (
          <List.Item
            key={cert.name}
            description={`自定义 · ${cert.name}`}
            extra={
              <Space>
                <Button
                  size="mini"
                  fill="none"
                  onClick={() => onOpenDetail(`custom:${cert.name}`, cert.display)}
                >
                  详情
                </Button>
                <Button
                  size="mini"
                  fill="none"
                  color="danger"
                  onClick={() => onRemove(cert.name)}
                >
                  移除
                </Button>
              </Space>
            }
          >
            {cert.display}
          </List.Item>
        ))
      )}
    </ListGroup>
  );
}
