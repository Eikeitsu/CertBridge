import { Footer, List, NoticeBar } from "antd-mobile";
import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { ABOUT_LINKS, ABOUT_TIP, brandMarkSrc } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { useAppSelector } from "@/app/store/hooks";
import { selectDeviceLabel, selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import { openUrl } from "@/shared/api/ksu";
import { HelpCollapse } from "@/shared/ui/HelpCollapse";
import { LinkRow } from "@/shared/ui/LinkRow";
import { ListGroup } from "@/shared/ui/ListGroup";

export function AboutSection() {
  const status = useAppSelector(selectModuleStatus);
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  return (
    <>
      <NoticeBar
        color="info"
        content={`${status.version || "版本未知"} · ${deviceLabel || "本机"} · ${androidLabel}`}
      />

      <div className="cb-about-hero">
        <img src={assetUrl(brandMarkSrc(resolvedTheme))} alt="" />
        <strong>CertBridge</strong>
        <span>
          {status.version || EMPTY_PLACEHOLDER} · {androidLabel}
        </span>
      </div>

      <ListGroup title="模块信息">
        <List.Item extra={status.version || EMPTY_PLACEHOLDER}>版本</List.Item>
        <List.Item extra={deviceLabel || EMPTY_PLACEHOLDER}>设备</List.Item>
        <List.Item extra={androidLabel}>系统</List.Item>
        <List.Item extra={status.root || EMPTY_PLACEHOLDER}>Root</List.Item>
        <List.Item extra={status.mount_mode || EMPTY_PLACEHOLDER}>挂载模式</List.Item>
        <List.Item extra={status.tmpfs_style || EMPTY_PLACEHOLDER}>临时路径风格</List.Item>
      </ListGroup>

      <ListGroup title="链接">
        {ABOUT_LINKS.map((link) => (
          <LinkRow key={link.id} label={link.label} onClick={() => void openUrl(link.url)} />
        ))}
      </ListGroup>

      <ListGroup title="支持">
        <List.Item>
          <HelpCollapse title={ABOUT_TIP.title} inset>
            <p>{ABOUT_TIP.body}</p>
            <img className="cb-tip-qr" src={assetUrl(ABOUT_TIP.src)} alt={ABOUT_TIP.alt} />
          </HelpCollapse>
        </List.Item>
      </ListGroup>

      <Footer content="CertBridge · 系统证书桥" />
    </>
  );
}
