import { HelpCollapse } from "@/shared/ui/HelpCollapse";
import { ListGroup } from "@/shared/ui/ListGroup";
import { List } from "antd-mobile";

export function CertsTips() {
  return (
    <ListGroup title="使用提示">
      <List.Item>
        <HelpCollapse title="永久 vs 临时" inset>
          <p>永久证书写入系统信任后需重启；临时挂载可立即生效，卸载即恢复。</p>
        </HelpCollapse>
        <HelpCollapse title="找不到证书？" inset>
          <p>确认 App 已安装且导出了 CA；也可手动导入 PEM / DER / hash.0。</p>
        </HelpCollapse>
      </List.Item>
    </ListGroup>
  );
}
