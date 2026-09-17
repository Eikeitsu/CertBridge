import { useState } from "react";
import { ABOUT_TIP, ABOUT_TIP_CHANNELS } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { ImagePreview } from "@/shared/ui/ImagePreview";

type AboutTipBlockProps = {
  variant?: "dashboard" | "ops" | "terminal";
};

export function AboutTipBlock({ variant = "dashboard" }: AboutTipBlockProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const active =
    ABOUT_TIP_CHANNELS.find((item) => item.id === previewId) ?? null;

  return (
    <div className={`bf-about-tip bf-about-tip--${variant}`}>
      {variant === "terminal" ? (
        <div className="bf-about-tip__title"># tip</div>
      ) : variant === "ops" ? (
        <strong>{ABOUT_TIP.title}</strong>
      ) : (
        <p className="bf-about-tip__title">{ABOUT_TIP.title}</p>
      )}

      <div className="bf-about-tip__actions">
        {ABOUT_TIP_CHANNELS.map((channel) => (
          <button
            key={channel.id}
            type="button"
            className={`bf-about-tip__btn bf-about-tip__btn--${channel.id}${
              variant === "terminal" ? " is-terminal" : ""
            }${variant === "ops" ? " is-ops" : ""}`}
            onClick={() => setPreviewId(channel.id)}
          >
            {variant === "terminal" ? `$ ${channel.labelEn}` : channel.label}
          </button>
        ))}
      </div>

      <p className="bf-about-tip__body">{ABOUT_TIP.body}</p>

      <ImagePreview
        open={!!active}
        onClose={() => setPreviewId(null)}
        src={active ? assetUrl(active.src) : ""}
        title={active?.label ?? ABOUT_TIP.title}
        alt={active?.alt}
      />
    </div>
  );
}
