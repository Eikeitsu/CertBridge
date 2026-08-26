import { useCallback, useState } from "react";
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
import { isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
import { copyText } from "@/shared/lib/copyText";
import { fileToBase64, parseKv } from "@/shared/lib/parse";
import { toastByRebootFlag } from "@/shared/lib/rebootToast";
import { isSafeSdPath } from "@/shared/lib/sdPath";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import { HotMountMode, type BuiltinCertKind } from "@/entities/module/enums";
import { HOT_MOUNT_CONFIRM_LABEL } from "@/shared/config/certs";

const SILENT_REFRESH = { syncApps: false } as const;

export function useCertActions() {
  const dispatch = useAppDispatch();
  const { voice } = usePackVoice();
  const c = voice.certs;
  const { isPending, runExclusive } = useAsyncLock();
  const [pendingKind, setPendingKind] = useState<string | null>(null);

  const handleToggleBuiltin = useCallback(
    async (kind: BuiltinCertKind, checked: boolean) => {
      await runExclusive(async () => {
        setPendingKind(kind);
        dispatch(patchStatus({ [`${kind}_enabled`]: checked ? FLAG_ON : FLAG_OFF }));
        try {
          const result = await toggleBuiltin(kind, checked ? FLAG_ON : FLAG_OFF);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr), "bad");
            void dispatch(refreshStatus(SILENT_REFRESH));
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
          toastByRebootFlag(
            kv,
            checked ? "已开启，重启后生效" : "已关闭，重启后移除",
            checked ? "已开启（与当前生效一致）" : "已关闭（与当前生效一致）",
          );
        } finally {
          setPendingKind(null);
        }
      });
    },
    [dispatch, runExclusive],
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
          toastByRebootFlag(kv, "已导入，重启后生效", "已导入（无需重启）");
          void dispatch(refreshStatus(SILENT_REFRESH));
        } catch {
          toast(c.importReadFail, "bad");
        }
      });
      return false;
    },
    [c.importReadFail, dispatch, runExclusive],
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
          toastByRebootFlag(kv, "已导入，重启后生效", "已导入（无需重启）");
        }
        void dispatch(refreshStatus(SILENT_REFRESH));
      });
    },
    [c.presetUnchanged, dispatch, runExclusive],
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
          toastByRebootFlag(kv, "已移除，重启后生效", "已移除（与当前生效一致）");
          void dispatch(refreshStatus(SILENT_REFRESH));
        },
      });
    },
    [c.removeConfirmBody, c.removeConfirmOk, c.removeConfirmTitle, dispatch],
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
        title: `立即挂载${HOT_MOUNT_CONFIRM_LABEL[mode]}中的有效 CA？`,
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
                ? `已挂载 ${addedCount} 张，${failedCount} 个会话未覆盖`
                : `已免重启挂载 ${addedCount} 张证书`,
              failedCount > 0 ? "warn" : "ok",
            );
            void dispatch(refreshStatus(SILENT_REFRESH));
          }),
      });
    },
    [c, dispatch, runExclusive],
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
                ? `卸载未完成，仍有 ${fields.hot_remaining} 个会话，请重试或重启`
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
  }, [c, dispatch, runExclusive]);

  return {
    isPending,
    pendingKind,
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
