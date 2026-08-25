import { PageStack } from "@/shared/ui/layout";
import { HideIntroCard } from "./HideIntroCard";
import { HideStatusCard } from "./HideStatusCard";
import { HideGuidePanel } from "./HideGuidePanel";

export function HidePage() {
  return (
    <PageStack>
      <HideIntroCard />
      <HideStatusCard />
      <HideGuidePanel />
    </PageStack>
  );
}
