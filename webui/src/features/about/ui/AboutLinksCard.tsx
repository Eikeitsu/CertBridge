import { ABOUT_LINKS, ABOUT_TIP, BRAND } from "@/shared/config/brand";
import { assetUrl } from "@/shared/config/assets";
import { openUrl } from "@/shared/api/ksu";

export function AboutLinksCard() {
  return (
    <div className="cb-stack cb-stack--tight">
      <section className="cb-card">
        <h3 className="cb-card__title">资源与链接</h3>
        <p className="cb-card__meta">文档、源码与相关工具</p>
        <div className="cb-about-links">
          {ABOUT_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className="cb-about-link"
              onClick={() => void openUrl(link.url)}
            >
              <span className="cb-about-link__label">{link.label}</span>
              <span className="cb-about-link__chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="cb-card cb-about-tip">
        <h3 className="cb-card__title">{ABOUT_TIP.title}</h3>
        <p className="cb-card__meta">微信扫码即可，金额随意</p>
        <div className="cb-about-tip__panel">
          <div className="cb-about-tip__badge">微信支付</div>
          <img
            className="cb-about-tip__qr"
            src={assetUrl(ABOUT_TIP.src)}
            alt={ABOUT_TIP.alt}
            width={168}
            height={168}
          />
          <p className="cb-about-tip__name">{BRAND.author}</p>
        </div>
        <p className="cb-about-tip__body">{ABOUT_TIP.body}</p>
      </section>
    </div>
  );
}
