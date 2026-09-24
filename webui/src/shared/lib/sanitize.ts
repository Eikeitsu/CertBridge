import i18n from "@/shared/i18n";
import { isFlagOn } from "@/shared/lib/flag";
import { TrustTone } from "@/entities/module/enums";

export function resolveTrustLabel(status: {
  disabled?: string;
  inject_error?: string;
  inject_message?: string;
  inject_hint?: string;
  pending_reboot?: string;
  apex_ok?: string;
  desc_short?: string;
  desc_body?: string;
  hot_active?: string;
  active_count?: string;
}): { tone: TrustTone; title: string; hint: string } {
  const t = i18n.t.bind(i18n);
  const shortLabel = stripStatusEmoji(status.desc_short || "");
  const injectHint = [status.inject_message, status.inject_hint]
    .filter(Boolean)
    .join(" · ");
  const hint = injectHint || cleanStatusBody(status.desc_body) || "";

  if (isFlagOn(status.disabled)) {
    return { tone: TrustTone.Idle, title: shortLabel || t("trust.disabled"), hint };
  }

  if (isFlagOn(status.pending_reboot)) {
    return {
      tone: TrustTone.Warn,
      title:
        shortLabel ||
        (isFlagOn(status.hot_active) ? t("trust.pendingHot") : t("trust.pending")),
      hint: cleanStatusBody(status.desc_body) || hint,
    };
  }

  if (/稳定中|注入中|检测中|启动中|Stable|Inject|Check|Boot|Pending/i.test(shortLabel)) {
    return {
      tone: TrustTone.Idle,
      title: shortLabel || t("trust.stabilizing"),
      hint: cleanStatusBody(status.desc_body) || t("trust.stabilizingHint"),
    };
  }

  if (
    isFlagOn(status.inject_error) ||
    /失败|异常|需重装|fail|error|abnormal/i.test(shortLabel)
  ) {
    return {
      tone: TrustTone.Bad,
      title: shortLabel || t("trust.injectError"),
      hint: injectHint || cleanStatusBody(status.desc_body) || t("trust.checkLog"),
    };
  }

  if (shortLabel) {
    const isIdle = /未启用|idle|off/i.test(shortLabel);
    const isWarn = /待重启|热挂载|pending|hot/i.test(shortLabel);
    let title = shortLabel;
    if (
      (/^运行正常/.test(shortLabel) || /^OK\b/i.test(shortLabel)) &&
      !/\d+/.test(shortLabel)
    ) {
      const n = String(status.active_count || "").replace(/\D/g, "") || "0";
      title = n === "0" ? t("trust.ok") : t("trust.okCount", { count: n });
    }
    return {
      tone: isIdle ? TrustTone.Idle : isWarn ? TrustTone.Warn : TrustTone.Ok,
      title,
      hint: cleanStatusBody(status.desc_body) || hint,
    };
  }

  if (status.apex_ok === "1" || status.apex_ok === "2") {
    return {
      tone: TrustTone.Ok,
      title: t("trust.okCount", { count: status.active_count || 0 }),
      hint: cleanStatusBody(status.desc_body) || hint,
    };
  }

  return {
    tone: TrustTone.Bad,
    title: t("trust.abnormal"),
    hint: injectHint || t("trust.checkLog"),
  };
}

function stripStatusEmoji(text: string): string {
  return text.replace(/^(?:✅|⚠️|⚠|❌|⏳|🔥|💤|✨|🔎|⛔|\uFE0F|\s)+/u, "").trim();
}

function cleanStatusBody(body?: string): string {
  if (!body) return "";
  return body.replace(/^\[[^\]]*\]\s*/, "").trim();
}
