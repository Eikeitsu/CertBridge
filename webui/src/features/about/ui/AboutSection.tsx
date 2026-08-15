import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { ABOUT_LINKS, ABOUT_TIP, brandMarkSrc } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import { openUrl } from "@/shared/api/ksu";
import { NxCard, NxCollapse, NxSection } from "@/shared/ui";

export function AboutSection() {
  const status = useAppSelector(selectModuleStatus);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  return (
    <NxSection eyebrow="About" title="关于 CertBridge">
      <div className="nx-about-hero">
        <img src={assetUrl(brandMarkSrc(resolvedTheme))} alt="" />
        <strong>CertBridge</strong>
        <span>
          {status.version || EMPTY_PLACEHOLDER} · {androidLabel}
        </span>
      </div>

      <div className="nx-link-list">
        {ABOUT_LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            className="nx-link"
            onClick={() => void openUrl(link.url)}
          >
            {link.label}
            <span>打开</span>
          </button>
        ))}
      </div>

      <NxCard>
        <NxCollapse title={ABOUT_TIP.title}>
          <p>{ABOUT_TIP.body}</p>
          <img className="nx-tip-qr" src={assetUrl(ABOUT_TIP.src)} alt={ABOUT_TIP.alt} />
        </NxCollapse>
      </NxCard>
    </NxSection>
  );
}
