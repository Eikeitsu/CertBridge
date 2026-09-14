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
      ? "cb-hero cb-hero--canvas"
      : variant === "summary"
        ? "cb-hero cb-hero--summary"
        : "cb-hero";

  return (
    <section className={cls}>
      <p className="cb-hero__kicker">{kicker}</p>
      <h1 className="cb-hero__title">{overview.trust.title}</h1>
      <p className="cb-hero__desc">{desc}</p>
      <div className="cb-btn-row" style={{ marginTop: 14 }}>
        <Tag tone={resolveToneTag(overview.trust.tone)}>{overview.shortDesc}</Tag>
        {overview.isHotMountActive ? <Tag tone="ok">HOT</Tag> : null}
      </div>
    </section>
  );
}
