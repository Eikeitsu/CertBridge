import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { brandMarkSrc } from "@/shared/config/brand";
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
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;
  const size = large ? 64 : 48;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: large ? 16 : 12,
        marginBottom: large ? 0 : 12,
      }}
    >
      <img
        src={assetUrl(brandMarkSrc(resolvedTheme))}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: large ? 16 : 12 }}
      />
      <div>
        <strong style={{ fontSize: large ? "1.25rem" : undefined }}>CertBridge</strong>
        <div style={{ fontSize: "0.78rem", color: "var(--cb-ink-3)" }}>
          {status.version || EMPTY_PLACEHOLDER} · {androidLabel}
        </div>
      </div>
    </div>
  );
}
