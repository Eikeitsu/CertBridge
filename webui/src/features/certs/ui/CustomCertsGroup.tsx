import { Button, List } from "antd-mobile";
import {
  DeleteOutline,
  InformationCircleOutline,
  UploadOutline,
} from "antd-mobile-icons";
import { useAppSelector } from "@/app/store/hooks";
import { selectCustomCertificates } from "@/features/status/model/selectors";
import { CERT_IMPORT_ACCEPT } from "@/shared/config/certs";
import { EmptyHint, FilePickButton, ListGroup, ListRow } from "@/shared/ui";

type CustomCertsGroupProps = {
  onImport: (file: File) => void;
  onOpenDetail: (id: string, title: string) => void;
  onRemove: (name: string) => void;
};

export function CustomCertsGroup({
  onImport,
  onOpenDetail,
  onRemove,
}: CustomCertsGroupProps) {
  const customCertificates = useAppSelector(selectCustomCertificates);

  return (
    <ListGroup
      title="自定义证书"
      meta="PEM / DER / hash.0 · 校验 X.509、有效期与 CA:TRUE"
      action={
        <FilePickButton accept={CERT_IMPORT_ACCEPT.join(",")} onPick={onImport}>
          <UploadOutline />
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
          <ListRow
            key={cert.name}
            title={cert.display}
            subtitle="自定义"
            actions={
              <>
                <Button
                  size="mini"
                  fill="none"
                  onClick={() => onOpenDetail(`custom:${cert.name}`, cert.display)}
                >
                  <InformationCircleOutline />
                </Button>
                <Button
                  size="mini"
                  fill="none"
                  color="danger"
                  onClick={() => onRemove(cert.name)}
                >
                  <DeleteOutline />
                </Button>
              </>
            }
          />
        ))
      )}
    </ListGroup>
  );
}
