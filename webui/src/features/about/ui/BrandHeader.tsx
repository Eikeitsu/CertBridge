import { BRAND } from "@/shared/config/brand";

type BrandHeaderProps = {
  markSrc: string;
  version: string;
  androidLabel: string;
};

export function BrandHeader({ markSrc, version, androidLabel }: BrandHeaderProps) {
  return (
    <div className="brand-about">
      <span className="cb-brand-mark">
        <img src={markSrc} alt="" />
      </span>
      <div>
        <h3>{BRAND.name}</h3>
        <p>
          {BRAND.nameEn} · {version} · {androidLabel}
        </p>
      </div>
    </div>
  );
}
