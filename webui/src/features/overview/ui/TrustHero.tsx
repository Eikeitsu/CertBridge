import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { TrustTone } from "@/entities/module/enums";
import { Tag } from "@/shared/ui/primitives";

type TrustHeroProps = {
  overview: TrustOverview;
};

function resolveToneTag(tone: TrustTone): "ok" | "bad" | "warn" | "default" {
  if (tone === TrustTone.Ok) return "ok";
  if (tone === TrustTone.Bad) return "bad";
  if (tone === TrustTone.Warn) return "warn";
  return "default";
}

export function TrustHero({ overview }: TrustHeroProps) {
  const desc =
    overview.injectDiagnosis?.hint ||
    (overview.activeNames.length
      ? `当前：${overview.activeNames.join("、")}`
      : overview.trust.hint || overview.description);

  return (
    <section className="cb-hero">
      <p className="cb-hero__kicker">信任状态</p>
      <h1 className="cb-hero__title">{overview.trust.title}</h1>
      <p className="cb-hero__desc">{desc}</p>
      <div className="cb-btn-row" style={{ marginTop: 14 }}>
        <Tag tone={resolveToneTag(overview.trust.tone)}>{overview.shortDesc}</Tag>
        {overview.isHotMountActive ? <Tag tone="ok">临时挂载中</Tag> : null}
      </div>
    </section>
  );
}
