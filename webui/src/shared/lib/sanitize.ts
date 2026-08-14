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
  const shortLabel = stripStatusEmoji(status.desc_short || "");
  const injectHint = [status.inject_message, status.inject_hint]
    .filter(Boolean)
    .join(" · ");
  const hint = injectHint || cleanStatusBody(status.desc_body) || "";

  if (isFlagOn(status.disabled)) {
    return { tone: TrustTone.Idle, title: shortLabel || "模块已禁用", hint };
  }

  if (isFlagOn(status.pending_reboot)) {
    return {
      tone: TrustTone.Warn,
      title:
        shortLabel ||
        (isFlagOn(status.hot_active) ? "热挂载 · 永久配置待重启" : "待重启生效"),
      hint: cleanStatusBody(status.desc_body) || hint,
    };
  }

  if (isFlagOn(status.inject_error) || /失败|异常|需重装/.test(shortLabel)) {
    return {
      tone: TrustTone.Bad,
      title: shortLabel || "注入异常",
      hint: injectHint || cleanStatusBody(status.desc_body) || "请查看日志或重启后再试",
    };
  }

  if (shortLabel) {
    const isIdle = /未启用/.test(shortLabel);
    const isWarn = /待重启|热挂载/.test(shortLabel);
    return {
      tone: isIdle ? TrustTone.Idle : isWarn ? TrustTone.Warn : TrustTone.Ok,
      title: shortLabel,
      hint: cleanStatusBody(status.desc_body) || hint,
    };
  }

  if (status.apex_ok === "1" || status.apex_ok === "2") {
    return {
      tone: TrustTone.Ok,
      title: `运行正常 · ${status.active_count || 0} 张`,
      hint: cleanStatusBody(status.desc_body) || hint,
    };
  }

  return {
    tone: TrustTone.Bad,
    title: "状态异常",
    hint: injectHint || "请查看日志或重启后再试",
  };
}

function stripStatusEmoji(text: string): string {
  return text
    .replace(/^(?:✅|⚠️|⚠|❌|⏳|🔥|💤|\uFE0F|\s)+/u, "")
    .trim();
}

function cleanStatusBody(body?: string): string {
  if (!body) return "";
  return body.replace(/^\[[^\]]*\]\s*/, "").trim();
}
