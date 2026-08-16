import { List } from "antd-mobile";
import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { ABOUT_LINKS, ABOUT_TIP, brandMarkSrc } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import { openUrl } from "@/shared/api/ksu";
import { HelpCollapse } from "@/shared/ui/HelpCollapse";
import { LinkRow } from "@/shared/ui/LinkRow";
import { ListGroup } from "@/shared/ui/ListGroup";

export function AboutSection() {
  const status = useAppSelector(selectModuleStatus);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  return (
    <>
      <div className="cb-about-hero">
        <img src={assetUrl(brandMarkSrc(resolvedTheme))} alt="" />
        <strong>CertBridge</strong>
        <span>
          {status.version || EMPTY_PLACEHOLDER} · {androidLabel}
        </span>
      </div>

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
    </>
  );
}
