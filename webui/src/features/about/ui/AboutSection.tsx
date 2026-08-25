import { Card } from "@/shared/ui/primitives";
import { AboutHero } from "./AboutHero";
import { AboutModuleInfo } from "./AboutModuleInfo";
import { AboutLinksCard } from "./AboutLinksCard";

export function AboutSection() {
  return (
    <>
      <Card title="关于证书桥">
        <AboutHero />
        <AboutModuleInfo />
      </Card>
      <AboutLinksCard />
    </>
  );
}
