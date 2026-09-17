import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { TrustTone } from "@/entities/module/enums";
import { Tag } from "@/shared/ui/primitives";

type TrustHeroProps = {
  overview: TrustOverview;
  kicker: string;
  emptyActive: string;
  variant?: "default" | "summary" | "canvas";
};

function resolveToneTag(tone: TrustTone): "ok" | "bad" | "warn" | "default" {
  if (tone === TrustTone.Ok) return "ok";
  if (tone === TrustTone.Bad) return "bad";
  if (tone === TrustTone.Warn) return "warn";
  return "default";
}

export function TrustHero({
  overview,
  kicker,
  emptyActive,
  variant = "default",
}: TrustHeroProps) {
  const desc =
    overview.injectDiagnosis?.hint ||
    (overview.activeNames.length
      ? overview.activeNames.join(" · ")
      : overview.trust.hint || overview.description || emptyActive);

  const cls =
    variant === "canvas"
      ? "bf-hero bf-hero--canvas"
      : variant === "summary"
        ? "bf-hero bf-hero--summary"
        : "bf-hero";

  return (
    <section className={cls}>
      <p className="bf-hero__kicker">{kicker}</p>
      <h1 className="bf-hero__title">{overview.trust.title}</h1>
      <p className="bf-hero__desc">{desc}</p>
      <div className="bf-btn-row" style={{ marginTop: 14 }}>
        <Tag tone={resolveToneTag(overview.trust.tone)}>
          {overview.shortDesc}
        </Tag>
        {overview.isHotMountActive ? <Tag tone="ok">HOT</Tag> : null}
      </div>
    </section>
  );
}
