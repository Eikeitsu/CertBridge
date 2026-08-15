import type { BuiltinCertKind } from "@/entities/module/enums";
import { useAppSelector } from "@/app/store/hooks";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import { BUILTIN_BRAND_ICON, resolveBrandIconSrc } from "@/shared/config/certs";
import { assetUrl } from "@/shared/config/assets";

type CertBrandIconProps = {
  kind: BuiltinCertKind;
  className?: string;
};

export function CertBrandIcon({ kind, className }: CertBrandIconProps) {
  const theme = useAppSelector(selectResolvedTheme);
  const brand = BUILTIN_BRAND_ICON[kind];
  const inline = Boolean(className?.includes("is-inline"));
  const src = resolveBrandIconSrc(kind, theme, inline);

  return (
    <span
      className={["nx-brand-icon", className].filter(Boolean).join(" ")}
      data-kind={kind}
      data-theme={theme}
      title={brand.label}
      aria-hidden
    >
      <img
        src={assetUrl(src)}
        alt=""
        width={inline ? 22 : 40}
        height={inline ? 22 : 40}
        decoding="async"
      />
    </span>
  );
}
