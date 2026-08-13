import type { ReactNode } from "react";
import { List } from "antd-mobile";
import { ContentOutline, LinkOutline, SmileOutline } from "antd-mobile-icons";
import { ABOUT_LINKS } from "@/shared/config/brand";
import { BuiltinCertKind } from "@/entities/module/enums";
import { CertBrandIcon } from "@/features/certs/ui/CertBrandIcon";
import { openUrl } from "@/shared/api/ksu";
import { LinkRow } from "@/shared/ui";

const LINK_ICONS: Record<string, ReactNode> = {
  docs: <ContentOutline />,
  repo: <LinkOutline />,
  coolapk: <SmileOutline />,
  [BuiltinCertKind.Reqable]: (
    <CertBrandIcon kind={BuiltinCertKind.Reqable} className="is-inline" />
  ),
  [BuiltinCertKind.ProxyPin]: (
    <CertBrandIcon kind={BuiltinCertKind.ProxyPin} className="is-inline" />
  ),
};

export function AboutLinks() {
  return (
    <List>
      {ABOUT_LINKS.map((link) => (
        <LinkRow
          key={link.id}
          label={
            <>
              {LINK_ICONS[link.id]}
              {link.label}
            </>
          }
          onClick={() => void openUrl(link.url)}
        />
      ))}
    </List>
  );
}
