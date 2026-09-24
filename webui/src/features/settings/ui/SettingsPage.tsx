import { useState } from "react";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { PageStack } from "@/shared/ui/layout";
import { Card } from "@/shared/ui/primitives";
import { AppearancePanel } from "./appearance/AppearancePanel";
import { UpdateChannelPanel } from "./UpdateChannelPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { MoreNavRow, MoreSubHeader } from "./MoreNav";
import { ShowHideTabCard } from "./ShowHideTabCard";
import { MountInjectPanels } from "./MountInjectPanels";

type MoreView = "hub" | "appearance" | "mount";

export function SettingsPage() {
  const { voice } = usePackVoice();
  const m = voice.more;
  const [view, setView] = useState<MoreView>("hub");

  if (view === "appearance") {
    return (
      <PageStack className="bf-stack--loose">
        <MoreSubHeader
          title={m.appearanceTitle}
          backLabel={voice.tabs.more}
          onBack={() => setView("hub")}
        />
        <AppearancePanel title={m.appearanceTitle} meta={m.appearanceMeta} />
      </PageStack>
    );
  }

  if (view === "mount") {
    return (
      <PageStack className="bf-stack--loose">
        <MoreSubHeader
          title={m.mountTitle}
          backLabel={voice.tabs.more}
          onBack={() => setView("hub")}
        />
        <MountInjectPanels />
      </PageStack>
    );
  }

  return (
    <PageStack className="bf-stack--loose">
      <div>
        <h1 className="bf-page-title">{voice.tabs.more}</h1>
        <p className="bf-page-sub">{m.hubMeta}</p>
      </div>
      <Card>
        <MoreNavRow
          title={m.appearanceTitle}
          desc={m.appearanceMeta}
          onClick={() => setView("appearance")}
        />
        <MoreNavRow
          title={m.mountTitle}
          desc={m.mountMeta}
          onClick={() => setView("mount")}
        />
      </Card>
      <ShowHideTabCard
        title={m.navTitle}
        meta={m.navMeta}
        rowTitle={m.showHideTitle}
        rowDesc={m.showHideDesc}
      />
      <UpdateChannelPanel />
      <AboutSection title={m.aboutTitle} />
    </PageStack>
  );
}
