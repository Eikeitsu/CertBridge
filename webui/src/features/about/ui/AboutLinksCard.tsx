import { ABOUT_LINKS, ABOUT_TIP } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { openUrl } from "@/shared/api/ksu";
import { Button, Card } from "@/shared/ui/primitives";

export function AboutLinksCard() {
  return (
    <Card title="链接">
      <div className="cb-btn-row">
        {ABOUT_LINKS.map((link) => (
          <Button key={link.id} variant="ghost" onClick={() => void openUrl(link.url)}>
            {link.label}
          </Button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "var(--cb-ink-3)" }}>
          {ABOUT_TIP.title}
        </p>
        <img
          src={assetUrl(ABOUT_TIP.src)}
          alt={ABOUT_TIP.alt}
          width={160}
          height={160}
          style={{
            display: "block",
            borderRadius: 12,
            background: "var(--cb-surface-2)",
          }}
        />
        <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "var(--cb-ink-3)" }}>
          {ABOUT_TIP.body}
        </p>
      </div>
    </Card>
  );
}
