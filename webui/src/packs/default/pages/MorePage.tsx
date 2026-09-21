import { useState } from "react";
import { AppearancePanel } from "@/features/settings/ui/appearance/AppearancePanel";
import { UpdateChannelPanel } from "@/features/settings/ui/UpdateChannelPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { MoreNavRow, MoreSubHeader } from "@/features/settings/ui/MoreNav";
import { ShowHideTabCard } from "@/features/settings/ui/ShowHideTabCard";
import { MountInjectPanels } from "@/features/settings/ui/MountInjectPanels";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { DEFAULT_VOICE } from "../voice";

type MoreView = "hub" | "appearance" | "mount";

export function DefaultMorePage() {
  const { voice } = usePackVoice();
  const m = voice.more;
  const v = DEFAULT_VOICE.more;
  const [view, setView] = useState<MoreView>("hub");

  if (view === "appearance") {
    return (
      <div className="pk-def-page">
        <MoreSubHeader
          title={m.appearanceTitle}
          backLabel={v.title}
          onBack={() => setView("hub")}
        />
        <section className="pk-def-section">
          <AppearancePanel title={m.appearanceTitle} meta={m.appearanceMeta} />
        </section>
      </div>
    );
  }

  if (view === "mount") {
    return (
      <div className="pk-def-page">
        <MoreSubHeader
          title={m.mountTitle}
          backLabel={v.title}
          onBack={() => setView("hub")}
        />
        <MountInjectPanels surface="card" />
      </div>
    );
  }

  return (
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>{m.hubMeta}</p>
      </header>

      <section className="pk-def-section">
        <div className="pk-def-group">
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
        </div>
      </section>

      <section className="pk-def-section">
        <ShowHideTabCard
          title={m.navTitle}
          meta={m.navMeta}
          rowTitle={m.showHideTitle}
          rowDesc={m.showHideDesc}
        />
      </section>

      <section className="pk-def-section">
        <UpdateChannelPanel />
      </section>

      <section className="pk-def-section">
        <AboutSection title={v.about} layout="dashboard" />
      </section>
    </div>
  );
}
