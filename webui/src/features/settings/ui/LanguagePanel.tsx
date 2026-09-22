import { useCallback, useEffect, useRef, useState } from "react";
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
import { writeStorage, readStorage } from "@/shared/lib/storage";
import { resolveUiLang, type UiLangPref } from "@/shared/i18n";
import { useApplyUiLang } from "@/features/theme/hooks/usePackVoice";
import { Card, Segment } from "@/shared/ui/primitives";

const OPTIONS: { id: UiLangPref; labelKey: string }[] = [
  { id: "system", labelKey: "follow_system" },
  { id: "zh-CN", labelKey: "lang_zh" },
  { id: "en", labelKey: "lang_en" },
];

function readPref(statusPref?: string): UiLangPref {
  if (statusPref === "system" || statusPref === "zh-CN" || statusPref === "en") {
    return statusPref;
  }
  const stored = readStorage(STORAGE_KEYS.uiLang);
  if (stored === "system" || stored === "zh-CN" || stored === "en") return stored;
  return "system";
}

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
  const [pref, setPref] = useState<UiLangPref>(() => readPref(status.ui_lang));
  const reqSeq = useRef(0);

  useEffect(() => {
    const next = readPref(status.ui_lang);
    setPref(next);
  }, [status.ui_lang]);

  const onPick = useCallback(
    (next: UiLangPref) => {
      if (next === pref) return;
      setPref(next);
      writeStorage(STORAGE_KEYS.uiLang, next);
      // 先切 UI；CLI 后台落盘，不锁 Segment
      apply(resolveUiLang(next));
      const seq = ++reqSeq.current;
      void (async () => {
        const result = await setUiLang(next);
        if (seq !== reqSeq.current) return;
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr), "bad");
          return;
        }
        const kv = parseKv(result.stdout || "");
        dispatch(mergeStatus(kv));
        toast(t("webui:language"), "ok");
      })();
    },
    [apply, dispatch, pref, t],
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
        onChange={(v) => onPick(v as UiLangPref)}
        options={OPTIONS.map((opt) => ({
          value: opt.id,
          label: t(`common:${opt.labelKey}`),
        }))}
      />
    </Card>
  );
}
