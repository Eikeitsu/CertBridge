import { List } from "antd-mobile";
import { AppOutline, CloseCircleOutline, FileOutline } from "antd-mobile-icons";
import { SectionLabel } from "@/shared/ui";

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
    <section className="cb-actions-block">
      <SectionLabel>{title}</SectionLabel>
      <List mode="card">
        <List.Item
          prefix={<CloseCircleOutline />}
          description={rebootHint}
          extra={<span className="cb-list-extra-action is-danger">重启</span>}
          onClick={onReboot}
          clickable
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
    </section>
  );
}
