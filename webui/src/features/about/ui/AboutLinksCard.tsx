import { ExternalLink } from "lucide-react";
import { ABOUT_LINKS } from "@/shared/config/brand";
import { openUrl } from "@/shared/api/ksu";
import { Button, Card } from "@/shared/ui/primitives";
import { AboutTipBlock } from "./AboutTipBlock";

type AboutLinksCardProps = {
  variant?: "dashboard" | "ops" | "terminal";
};

export function AboutLinksCard({ variant = "dashboard" }: AboutLinksCardProps) {
  if (variant === "terminal") {
    return (
      <section className="pk-con-block bf-about-links">
        <div className="pk-con-block__head">links</div>
        <div className="pk-con-actions bf-about-links__grid">
          {ABOUT_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className="pk-con-btn"
              onClick={() => void openUrl(link.url)}
            >
              {link.label}
            </button>
          ))}
        </div>
        <AboutTipBlock variant="terminal" />
      </section>
    );
  }

  if (variant === "ops") {
    return (
      <section className="pk-ops-panel bf-about-links bf-about-links--ops">
        <h3 className="pk-ops-panel__title">链接</h3>
        <div className="bf-about-links__menu">
          {ABOUT_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className="bf-about-links__menu-item"
              onClick={() => void openUrl(link.url)}
            >
              <span className="bf-about-links__menu-label">{link.label}</span>
              <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ))}
        </div>
        <AboutTipBlock variant="ops" />
      </section>
    );
  }

  return (
    <Card title="链接" className="bf-about-links">
      <div className="bf-about-links__tiles">
        {ABOUT_LINKS.map((link) => (
          <Button
            key={link.id}
            variant="ghost"
            className="bf-about-link-tile"
            onClick={() => void openUrl(link.url)}
          >
            {link.label}
          </Button>
        ))}
      </div>
      <AboutTipBlock variant="dashboard" />
    </Card>
  );
}
