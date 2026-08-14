import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { ABOUT_TIP, brandMarkSrc } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import { HelpCollapse, Panel } from "@/shared/ui";
import { BrandHeader } from "./BrandHeader";
import { AboutLinks } from "./AboutLinks";

export function AboutSection() {
  const status = useAppSelector(selectModuleStatus);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  return (
    <Panel>
      <BrandHeader
        markSrc={brandMarkSrc(resolvedTheme)}
        version={status.version || EMPTY_PLACEHOLDER}
        androidLabel={androidLabel}
      />
      <AboutLinks />
      <HelpCollapse title={ABOUT_TIP.title} inset>
        <p>{ABOUT_TIP.body}</p>
        <img className="tip-qr" src={assetUrl(ABOUT_TIP.src)} alt={ABOUT_TIP.alt} />
      </HelpCollapse>
    </Panel>
  );
}
