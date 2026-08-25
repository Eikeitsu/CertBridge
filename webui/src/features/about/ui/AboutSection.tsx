import { Card } from "@/shared/ui/primitives";
import { AboutHero } from "./AboutHero";
import { AboutModuleInfo } from "./AboutModuleInfo";
import { AboutLinksCard } from "./AboutLinksCard";

type AboutSectionProps = {
  title?: string;
  heroEmphasis?: boolean;
};

export function AboutSection({ title = "关于证书桥", heroEmphasis }: AboutSectionProps) {
  if (heroEmphasis) {
    return (
      <>
        <div className="cb-about-hero-block">
          <AboutHero large />
        </div>
        <Card title={title}>
          <AboutModuleInfo />
        </Card>
        <AboutLinksCard />
      </>
    );
  }

  return (
    <>
      <Card title={title}>
        <AboutHero />
        <AboutModuleInfo />
      </Card>
      <AboutLinksCard />
    </>
  );
}
