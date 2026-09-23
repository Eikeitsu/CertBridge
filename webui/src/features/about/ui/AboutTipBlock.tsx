import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ABOUT_TIP_CHANNELS, BRAND } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { ImagePreview } from "@/shared/ui/ImagePreview";

type AboutTipBlockProps = {
  variant?: "dashboard" | "ops" | "terminal";
};

export function AboutTipBlock({ variant = "dashboard" }: AboutTipBlockProps) {
  const { t } = useTranslation("webui");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const tipTitle = t("about.tip.title");
  const tipBody = t("about.tip.body", { author: BRAND.author });
  const active = ABOUT_TIP_CHANNELS.find((item) => item.id === previewId) ?? null;
  const channelLabel = (id: "wechat" | "alipay") => t(`about.tip.${id}`);
  const channelAlt = (id: "wechat" | "alipay") =>
    t(id === "wechat" ? "about.tip.wechatAlt" : "about.tip.alipayAlt");

  return (
    <div className={`bf-about-tip bf-about-tip--${variant}`}>
      {variant === "terminal" ? (
        <div className="bf-about-tip__title"># tip</div>
      ) : variant === "ops" ? (
        <strong>{tipTitle}</strong>
      ) : (
        <p className="bf-about-tip__title">{tipTitle}</p>
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
            {variant === "terminal" ? `$ ${channel.labelEn}` : channelLabel(channel.id)}
          </button>
        ))}
      </div>

      <p className="bf-about-tip__body">{tipBody}</p>

      <ImagePreview
        open={!!active}
        onClose={() => setPreviewId(null)}
        src={active ? assetUrl(active.src) : ""}
        title={active ? channelLabel(active.id) : tipTitle}
        alt={active ? channelAlt(active.id) : undefined}
      />
    </div>
  );
}
