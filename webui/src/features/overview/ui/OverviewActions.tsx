import { Button, List } from "antd-mobile";
import { AppOutline, CloseCircleOutline, FileOutline } from "antd-mobile-icons";

type OverviewActionsProps = {
  title: string;
  rebootTitle: string;
  rebootHint: string;
  manageLabel: string;
  tempLabel: string;
  isHotMountSupported: boolean;
  onReboot: () => void;
  onManageCerts: () => void;
};

export function OverviewActions({
  title,
  rebootTitle,
  rebootHint,
  manageLabel,
  tempLabel,
  isHotMountSupported,
  onReboot,
  onManageCerts,
}: OverviewActionsProps) {
  return (
    <List mode="card" header={title}>
      <List.Item
        prefix={<CloseCircleOutline />}
        description={rebootHint}
        extra={
          <Button size="mini" color="danger" onClick={onReboot}>
            重启
          </Button>
        }
      >
        {rebootTitle}
      </List.Item>
      <List.Item prefix={<AppOutline />} clickable arrowIcon onClick={onManageCerts}>
        {manageLabel}
      </List.Item>
      {isHotMountSupported ? (
        <List.Item prefix={<FileOutline />} clickable arrowIcon onClick={onManageCerts}>
          {tempLabel}
        </List.Item>
      ) : null}
    </List>
  );
}
