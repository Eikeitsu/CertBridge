import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { brandMarkSrc } from "@/shared/config/brand";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import { useState } from "react";

type AboutHeroProps = {
  large?: boolean;
  className?: string;
};

export function AboutHero({ large, className }: AboutHeroProps) {
  const status = useAppSelector(selectModuleStatus);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const [imgFailed, setImgFailed] = useState(false);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;
  const size = large ? 64 : 48;

  return (
    <div className={`bf-about-hero${className ? ` ${className}` : ""}`}>
      {imgFailed ? (
        <span
          className="bf-about-hero__fallback"
          style={{ width: size, height: size }}
          aria-hidden
        >
          CB
        </span>
      ) : (
        <img
          src={brandMarkSrc(resolvedTheme)}
          alt=""
          width={size}
          height={size}
          className="bf-about-hero__mark"
          style={{ borderRadius: large ? 16 : 12 }}
          onError={() => setImgFailed(true)}
        />
      )}
      <div>
        <strong
          className="bf-about-hero__name"
          style={{ fontSize: large ? "1.25rem" : undefined }}
        >
          CertBridge
        </strong>
        <div className="bf-about-hero__meta">
          {status.version || EMPTY_PLACEHOLDER} · {androidLabel}
        </div>
      </div>
    </div>
  );
}
