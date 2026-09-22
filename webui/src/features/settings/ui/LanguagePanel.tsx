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
import { Card, Segment } from "@/shared/ui/primitives";

const OPTIONS: { id: UiLangPref; labelKey: string }[] = [
  { id: "system", labelKey: "follow_system" },
  { id: "zh-CN", labelKey: "lang_zh" },
  { id: "en", labelKey: "lang_en" },
];

export function LanguagePanel({
  dense,
  surface = "card",
}: {
  dense?: boolean;
  surface?: "card" | "plain";
}) {
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
    <Card
      title={t("webui:language")}
      meta={t("webui:languageMeta")}
      surface={surface}
      className={dense ? "bf-card--dense bf-appearance__lang" : "bf-appearance__lang"}
    >
      <Segment
        layout="chips"
        value={pref}
        disabled={pending}
        onChange={(v) => void onPick(v as UiLangPref)}
        options={OPTIONS.map((opt) => ({
          value: opt.id,
          label: t(`common:${opt.labelKey}`),
        }))}
      />
    </Card>
  );
}
