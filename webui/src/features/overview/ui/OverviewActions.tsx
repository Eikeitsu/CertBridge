import { Button, List } from "antd-mobile";
import { AppOutline, CloseCircleOutline, FileOutline } from "antd-mobile-icons";

type OverviewActionsProps = {
  isHotMountSupported: boolean;
  onReboot: () => void;
  onManageCerts: () => void;
};

export function OverviewActions({
  isHotMountSupported,
  onReboot,
  onManageCerts,
}: OverviewActionsProps) {
  return (
    <List mode="card" header="快捷操作">
      <List.Item
        prefix={<CloseCircleOutline />}
        description="应用挂载变更建议重启"
        extra={
          <Button size="mini" color="danger" onClick={onReboot}>
            重启
          </Button>
        }
      >
        重启设备
      </List.Item>
      <List.Item prefix={<AppOutline />} clickable arrowIcon onClick={onManageCerts}>
        管理证书
      </List.Item>
      {isHotMountSupported ? (
        <List.Item prefix={<FileOutline />} clickable arrowIcon onClick={onManageCerts}>
          临时证书
        </List.Item>
      ) : null}
    </List>
  );
}
