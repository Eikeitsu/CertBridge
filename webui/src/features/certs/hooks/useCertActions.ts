import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/app/store/hooks";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import {
  hotMount,
  hotUnmount,
  importAppPreset,
  installCustom,
  listAppliedFingerprints,
  removeCustom,
  setHotAllow,
  toggleBuiltin,
  type AppPresetKind,
} from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { cliOutput, isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
import { copyText } from "@/shared/lib/copyText";
import { fileToBase64, parseKv } from "@/shared/lib/parse";
import { toastByRebootFlag } from "@/shared/lib/rebootToast";
import { isSafeSdPath } from "@/shared/lib/sdPath";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import { HotMountMode, type BuiltinCertKind } from "@/entities/module/enums";

const SILENT_REFRESH = { syncApps: false } as const;

export function useCertActions() {
  const { t } = useTranslation("webui");
  const dispatch = useAppDispatch();
  const { voice } = usePackVoice();
  const c = voice.certs;
  const { isPending, runExclusive } = useAsyncLock();

  const hotTargetLabel = useCallback(
    (mode: HotMountMode) => {
      switch (mode) {
        case HotMountMode.User:
          return t("certs.hotTargetUser");
        case HotMountMode.Sd:
          return t("certs.hotTargetSd");
        default:
          return t("certs.hotTargetAll");
      }
    },
    [t],
  );

  const handleToggleBuiltin = useCallback(
    (kind: BuiltinCertKind, checked: boolean) => {
      // 与隐藏开关一致：先翻 UI，CLI 后台跑，不禁用开关卡交互
      const enabled = checked ? FLAG_ON : FLAG_OFF;
      const previous = checked ? FLAG_OFF : FLAG_ON;
      dispatch(patchStatus({ [`${kind}_enabled`]: enabled }));
      void runExclusive(async () => {
        const result = await toggleBuiltin(kind, enabled);
        const kv = parseKv(cliOutput(result));
        // 契约行有时在 stderr：以 enabled 回包为准，避免误 toast / 回弹
        if (isCliFailure(result) && kv[`${kind}_enabled`] !== enabled) {
          toast(errorFromResult(result.stdout, result.stderr), "bad");
          // 只回滚该开关，避免全量 refresh 把乐观状态瞬间盖成绿色
          dispatch(patchStatus({ [`${kind}_enabled`]: previous }));
          return;
        }
        dispatch(mergeStatus(kv));
        toastByRebootFlag(
          kv,
          checked ? t("toast.toggleOn") : t("toast.toggleOff"),
          checked ? t("toast.toggleOnMatch") : t("toast.toggleOffMatch"),
        );
        // merge 已带 pending_reboot；勿再全量 status（含 hide/zygisk 探测，易卡 UI）
      });
    },
    [dispatch, runExclusive, t],
  );

  const handleImportFile = useCallback(
    async (file: File) => {
      await runExclusive(async () => {
        try {
          const payload = await fileToBase64(file);
          const result = await installCustom(payload);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr), "bad");
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
          toastByRebootFlag(kv, t("certs.importedReboot"), t("certs.importedOk"));
          void dispatch(refreshStatus(SILENT_REFRESH));
        } catch {
          toast(c.importReadFail, "bad");
        }
      });
      return false;
    },
    [c.importReadFail, dispatch, runExclusive, t],
  );

  const handleImportPreset = useCallback(
    (kind: AppPresetKind) => {
      void runExclusive(async () => {
        const result = await importAppPreset(kind);
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr), "bad");
          return;
        }
        const kv = parseKv(result.stdout || "");
        dispatch(mergeStatus(kv));
        if (kv.unchanged === FLAG_ON) {
          toast(c.presetUnchanged, "ok");
        } else {
          toastByRebootFlag(kv, t("certs.importedReboot"), t("certs.importedOk"));
        }
        void dispatch(refreshStatus(SILENT_REFRESH));
      });
    },
    [c.presetUnchanged, dispatch, runExclusive, t],
  );

  const handleExportFingerprints = useCallback(() => {
    void runExclusive(async () => {
      const rows = await listAppliedFingerprints();
      if (!rows.length) {
        toast(c.exportFpsEmpty, "warn");
        return;
      }
      const text = rows
        .map((r) => `${r.display || r.label}\t${r.sha256}\t${r.name}`)
        .join("\n");
      await copyText(text, c.exportFpsOk);
    });
  }, [c.exportFpsEmpty, c.exportFpsOk, runExclusive]);

  const handleRemoveCustom = useCallback(
    (fileName: string) => {
      confirmAction({
        title: c.removeConfirmTitle,
        content: c.removeConfirmBody,
        okText: c.removeConfirmOk,
        danger: true,
        onOk: async () => {
          const result = await removeCustom(fileName);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr), "bad");
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
          toastByRebootFlag(kv, t("certs.removedReboot"), t("certs.removedMatch"));
          void dispatch(refreshStatus(SILENT_REFRESH));
        },
      });
    },
    [c.removeConfirmBody, c.removeConfirmOk, c.removeConfirmTitle, dispatch, t],
  );

  const handleSetHotAllow = useCallback(
    (checked: boolean) => {
      const apply = () =>
        runExclusive(async () => {
          dispatch(patchStatus({ hot_allow: checked ? FLAG_ON : FLAG_OFF }));
          const result = await setHotAllow(checked ? FLAG_ON : FLAG_OFF);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr), "bad");
            void dispatch(refreshStatus(SILENT_REFRESH));
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
          toast(checked ? c.hotAllowOn : c.hotAllowOff, "ok");
        });

      if (!checked) {
        confirmAction({
          title: c.hotConfirmOffTitle,
          content: c.hotConfirmOffBody,
          okText: c.hotConfirmOffOk,
          danger: true,
          onOk: apply,
        });
        return;
      }

      void apply();
    },
    [c, dispatch, runExclusive],
  );

  const handleHotMount = useCallback(
    (mode: HotMountMode, sdPath?: string) => {
      if (mode !== HotMountMode.User && !isSafeSdPath(sdPath || "")) {
        toast(c.hotSdPathBad, "warn");
        return;
      }

      confirmAction({
        title: t("certs.hotMountConfirmTitle", { target: hotTargetLabel(mode) }),
        content: c.hotMountConfirmBody,
        okText: c.hotMountConfirmOk,
        onOk: () =>
          runExclusive(async () => {
            toast(c.hotMounting);
            const result = await hotMount(
              mode,
              mode === HotMountMode.User ? undefined : sdPath?.trim(),
            );
            const fields = parseKv(result.stdout);
            if (isCliFailure(result) || fields.ok !== FLAG_ON) {
              toast(errorFromResult(result.stdout, result.stderr), "bad");
              void dispatch(refreshStatus(SILENT_REFRESH));
              return;
            }
            dispatch(mergeStatus(fields));
            const addedCount = fields.hot_added || "0";
            const failedCount = Number(fields.hot_failed || 0);
            toast(
              failedCount > 0
                ? t("certs.hotMountedPartial", {
                    added: addedCount,
                    failed: failedCount,
                  })
                : t("certs.hotMounted", { count: addedCount }),
              failedCount > 0 ? "warn" : "ok",
            );
            void dispatch(refreshStatus(SILENT_REFRESH));
          }),
      });
    },
    [c, dispatch, hotTargetLabel, runExclusive, t],
  );

  const handleHotUnmount = useCallback(() => {
    confirmAction({
      title: c.hotUnmountConfirmTitle,
      content: c.hotUnmountConfirmBody,
      okText: c.hotUnmountConfirmOk,
      danger: true,
      onOk: () =>
        runExclusive(async () => {
          toast(c.hotUnmounting);
          const result = await hotUnmount();
          const fields = parseKv(result.stdout);
          if (isCliFailure(result) || fields.ok !== FLAG_ON) {
            toast(
              fields.hot_remaining
                ? t("certs.hotUnmountPartial", {
                    remaining: fields.hot_remaining,
                  })
                : errorFromResult(result.stdout, result.stderr),
              "bad",
            );
            void dispatch(refreshStatus(SILENT_REFRESH));
            return;
          }
          dispatch(mergeStatus(fields));
          toast(c.hotUnmounted, "ok");
          void dispatch(refreshStatus(SILENT_REFRESH));
        }),
    });
  }, [c, dispatch, runExclusive, t]);

  return {
    isPending,
    handleToggleBuiltin,
    handleImportFile,
    handleImportPreset,
    handleExportFingerprints,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  };
}
