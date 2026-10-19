import { AppearancePanel } from "@/features/settings/ui/appearance/AppearancePanel";
import { UpdateChannelPanel } from "@/features/settings/ui/UpdateChannelPanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { MoreNavRow, MoreSubHeader } from "@/features/settings/ui/MoreNav";
import { ShowHideTabCard } from "@/features/settings/ui/ShowHideTabCard";
import { MountInjectPanels } from "@/features/settings/ui/MountInjectPanels";
import { useMorePageModel } from "@/features/settings/hooks/useMorePageModel";

export function ConsoleMorePage() {
  const { chrome, m, v, view, setView } = useMorePageModel();

  if (view === "appearance") {
    return (
      <div className="pk-con-page">
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
      <div className="pk-con-page">
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
    <div className="pk-con-page">
      <pre className="pk-con-banner">{`# ${v.title}
# ${m.hubMeta}`}</pre>
      <section className="pk-con-block">
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
      <AboutSection title={v.about} layout="terminal" />
    </div>
  );
}
