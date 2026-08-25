import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { brandMarkSrc } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";

export function AboutHero() {
  const status = useAppSelector(selectModuleStatus);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <img
        src={assetUrl(brandMarkSrc(resolvedTheme))}
        alt=""
        width={48}
        height={48}
        style={{ borderRadius: 12 }}
      />
      <div>
        <strong>CertBridge</strong>
        <div style={{ fontSize: "0.78rem", color: "var(--cb-ink-3)" }}>
          {status.version || EMPTY_PLACEHOLDER} · {androidLabel}
        </div>
      </div>
    </div>
  );
}
