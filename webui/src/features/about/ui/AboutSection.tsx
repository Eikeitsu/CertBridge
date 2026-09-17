import { Card } from "@/shared/ui/primitives";
import { AboutHero } from "./AboutHero";
import { AboutModuleInfo } from "./AboutModuleInfo";
import { AboutLinksCard } from "./AboutLinksCard";

type AboutSectionProps = {
  title?: string;
  /** dashboard=默认大英雄区；ops=紧凑面板；terminal=终端块表 */
  layout?: "dashboard" | "ops" | "terminal";
  /** @deprecated 使用 layout="dashboard" */
  heroEmphasis?: boolean;
  surface?: "card" | "plain";
};

export function AboutSection({
  title = "关于证书桥",
  layout,
  heroEmphasis,
  surface = "card",
}: AboutSectionProps) {
  const resolved =
    layout ?? (heroEmphasis ? "dashboard" : "dashboard");

  if (resolved === "terminal") {
    return (
      <div className="bf-about bf-about--terminal">
        <section className="pk-con-block">
          <div className="pk-con-block__head">about</div>
          <div className="bf-about-hero-wrap">
            <AboutHero />
          </div>
          <AboutModuleInfo variant="shell" />
        </section>
        <AboutLinksCard variant="terminal" />
      </div>
    );
  }

  if (resolved === "ops") {
    return (
      <div className="bf-about bf-about--ops">
        <section className="pk-ops-panel">
          <h3 className="pk-ops-panel__title">{title}</h3>
          <AboutHero />
          <AboutModuleInfo variant="rail" />
        </section>
        <AboutLinksCard variant="ops" />
      </div>
    );
  }

  return (
    <div className="bf-about bf-about--dashboard">
      <div className="bf-about-hero-block">
        <AboutHero large />
      </div>
      <Card title={title} surface={surface}>
        <AboutModuleInfo variant="tiles" />
      </Card>
      <AboutLinksCard variant="dashboard" />
    </div>
  );
}
