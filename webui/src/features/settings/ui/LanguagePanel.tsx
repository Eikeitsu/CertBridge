import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { mergeStatus } from "@/features/status/model/statusSlice";
import { setUiLang } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { parseKv } from "@/shared/lib/parse";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { writeStorage } from "@/shared/lib/storage";
import { resolveUiLang, type UiLangPref } from "@/shared/i18n";
import { useApplyUiLang } from "@/features/theme/hooks/usePackVoice";

const OPTIONS: { id: UiLangPref; labelKey: string }[] = [
  { id: "system", labelKey: "follow_system" },
  { id: "zh-CN", labelKey: "lang_zh" },
  { id: "en", labelKey: "lang_en" },
];

export function LanguagePanel({ dense }: { dense?: boolean }) {
  const { t } = useTranslation(["webui", "common"]);
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const apply = useApplyUiLang();
  const [pref, setPref] = useState<UiLangPref>(
    () => (status.ui_lang as UiLangPref) || "system",
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const raw = (status.ui_lang as UiLangPref) || "system";
    if (raw === "system" || raw === "zh-CN" || raw === "en") setPref(raw);
    const resolved =
      (status.ui_lang_resolved as "zh-CN" | "en") ||
      resolveUiLang(raw === "system" || raw === "zh-CN" || raw === "en" ? raw : "system");
    apply(resolved);
  }, [status.ui_lang, status.ui_lang_resolved, apply]);

  const onPick = useCallback(
    async (next: UiLangPref) => {
      if (next === pref || pending) return;
      setPref(next);
      setPending(true);
      writeStorage(STORAGE_KEYS.uiLang, next);
      apply(resolveUiLang(next));
      const result = await setUiLang(next);
      setPending(false);
      if (isCliFailure(result)) {
        toast(errorFromResult(result.stdout, result.stderr), "bad");
        return;
      }
      const kv = parseKv(result.stdout || "");
      dispatch(mergeStatus(kv));
      toast(t("webui:language"), "ok");
    },
    [apply, dispatch, pending, pref, t],
  );

  return (
    <div className={dense ? "bf-panel is-dense" : "bf-panel"}>
      <div className="bf-panel__head">
        <strong>{t("webui:language")}</strong>
        <span>{t("webui:languageMeta")}</span>
      </div>
      <div className="bf-seg" role="group" aria-label={t("webui:language")}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`bf-seg__item${pref === opt.id ? " is-on" : ""}`}
            disabled={pending}
            onClick={() => void onPick(opt.id)}
          >
            {t(`common:${opt.labelKey}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
