import { useState } from "react";
import { AppearancePanel } from "@/features/settings/ui/appearance/AppearancePanel";
import { UpdateChannelPanel } from "@/features/settings/ui/UpdateChannelPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { MoreNavRow, MoreSubHeader } from "@/features/settings/ui/MoreNav";
import { ShowHideTabCard } from "@/features/settings/ui/ShowHideTabCard";
import { MountInjectPanels } from "@/features/settings/ui/MountInjectPanels";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

type MoreView = "hub" | "appearance" | "mount";

export function OpsMorePage() {
  const chrome = usePackChrome();
  const { voice } = usePackVoice();
  const m = voice.more;
  const v = chrome.more;
  const [view, setView] = useState<MoreView>("hub");

  if (view === "appearance") {
    return (
      <div className="pk-ops-page pk-ops-page--more">
        <MoreSubHeader
          title={m.appearanceTitle}
          backLabel={chrome.tabs.more}
          onBack={() => setView("hub")}
        />
        <AppearancePanel
          title={m.appearanceTitle}
          meta={m.appearanceMeta}
          surface="plain"
        />
      </div>
    );
  }

  if (view === "mount") {
    return (
      <div className="pk-ops-page pk-ops-page--more">
        <MoreSubHeader
          title={m.mountTitle}
          backLabel={chrome.tabs.more}
          onBack={() => setView("hub")}
        />
        <MountInjectPanels dense surface="plain" />
      </div>
    );
  }

  return (
    <div className="pk-ops-page pk-ops-page--more">
      <header className="pk-ops-pagehead pk-ops-pagehead--meta">
        <p>{m.hubMeta}</p>
      </header>
      <section className="pk-ops-panel">
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
      </section>
      <ShowHideTabCard
        title={m.navTitle}
        meta={m.navMeta}
        rowTitle={m.showHideTitle}
        rowDesc={m.showHideDesc}
        surface="plain"
      />
      <UpdateChannelPanel dense surface="plain" />
      <AboutSection title={v.about} layout="ops" />
    </div>
  );
}
