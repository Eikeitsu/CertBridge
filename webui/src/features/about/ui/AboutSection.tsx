import { Card } from "@/shared/ui/primitives";
import { AboutHero } from "./AboutHero";
import { AboutModuleInfo } from "./AboutModuleInfo";
import { AboutLinksCard } from "./AboutLinksCard";

type AboutSectionProps = {
  title?: string;
  heroEmphasis?: boolean;
};

export function AboutSection({ title = "关于证书桥", heroEmphasis }: AboutSectionProps) {
  return (
    <div className="cb-stack">
      <section className={`cb-card cb-about-head${heroEmphasis ? " is-hero" : ""}`}>
        <AboutHero large={heroEmphasis} />
      </section>
      <Card title={title} meta="本机与模块运行信息">
        <AboutModuleInfo />
      </Card>
      <AboutLinksCard />
    </div>
  );
}
