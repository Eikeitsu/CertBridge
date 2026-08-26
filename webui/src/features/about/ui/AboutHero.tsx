import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { BRAND, brandMarkSrc } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";

type AboutHeroProps = {
  large?: boolean;
};

export function AboutHero({ large }: AboutHeroProps) {
  const status = useAppSelector(selectModuleStatus);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` · API ${status.api}` : ""}`
    : EMPTY_PLACEHOLDER;
  const size = large ? 72 : 52;

  return (
    <div className={`cb-about-hero${large ? " cb-about-hero--large" : ""}`}>
      <img
        className="cb-about-hero__mark"
        src={assetUrl(brandMarkSrc(resolvedTheme))}
        alt=""
        width={size}
        height={size}
      />
      <div className="cb-about-hero__text">
        <div className="cb-about-hero__name">{BRAND.name}</div>
        <div className="cb-about-hero__en">{BRAND.nameEn}</div>
        <div className="cb-about-hero__meta">
          {status.version || EMPTY_PLACEHOLDER}
          <span className="cb-about-hero__dot">·</span>
          {androidLabel}
        </div>
      </div>
    </div>
  );
}
