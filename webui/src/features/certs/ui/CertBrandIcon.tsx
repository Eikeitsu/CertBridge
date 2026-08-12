import type { BuiltinCertKind } from "@/entities/module/types";

const BRAND_ICON: Record<BuiltinCertKind, { src: string; label: string }> = {
  reqable: {
    src: `${import.meta.env.BASE_URL}img/brands/reqable.png`,
    label: "Reqable",
  },
  proxypin: {
    src: `${import.meta.env.BASE_URL}img/brands/proxypin.png`,
    label: "ProxyPin",
  },
};

type CertBrandIconProps = {
  kind: BuiltinCertKind;
  className?: string;
};

export function CertBrandIcon({ kind, className }: CertBrandIconProps) {
  const brand = BRAND_ICON[kind];
  return (
    <span
      className={className ? `cb-brand-icon ${className}` : "cb-brand-icon"}
      data-kind={kind}
      title={brand.label}
      aria-hidden
    >
      <img src={brand.src} alt="" width={40} height={40} decoding="async" />
    </span>
  );
}
