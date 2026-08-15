import { useCallback, useState } from "react";
import { useAppDispatch } from "@/app/store/hooks";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import {
  hotMount,
  hotUnmount,
  installCustom,
  removeCustom,
  setHotAllow,
  toggleBuiltin,
} from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
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
          toast("读取文件失败", "bad");
        }
      });
      return false;
    },
    [dispatch, runExclusive],
  );

  const handleRemoveCustom = useCallback(
    (fileName: string) => {
      confirmAction({
        title: "移除自定义证书？",
        content: "重启后才会从系统信任库撤下。",
        okText: "移除",
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
    [dispatch],
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
          toast(checked ? "已允许手动临时挂载" : "已关闭临时挂载", "ok");
        });

      if (!checked) {
        confirmAction({
          title: "关闭临时挂载？",
          content: "关闭后无法新建临时会话；若当前有会话，将一并无痕卸载。",
          okText: "关闭",
          danger: true,
          onOk: apply,
        });
        return;
      }

      void apply();
    },
    [dispatch, runExclusive],
  );

  const handleHotMount = useCallback(
    (mode: HotMountMode, sdPath?: string) => {
      if (mode !== HotMountMode.User && !isSafeSdPath(sdPath || "")) {
        toast("存储卡路径不安全或不受支持", "warn");
        return;
      }

      confirmAction({
        title: `立即挂载${HOT_MOUNT_CONFIRM_LABEL[mode]}中的有效 CA？`,
        content: "无需重启，仅建立临时会话；重启后自动失效。",
        okText: "挂载",
        onOk: () =>
          runExclusive(async () => {
            toast("正在建立临时证书会话…");
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
    [dispatch, runExclusive],
  );

  const handleHotUnmount = useCallback(() => {
    confirmAction({
      title: "无痕卸载当前临时证书会话？",
      content: "永久配置与系统文件不会改变。",
      okText: "卸载",
      danger: true,
      onOk: () =>
        runExclusive(async () => {
          toast("正在安全卸载临时证书…");
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
          toast("临时证书已无痕卸载", "ok");
          void dispatch(refreshStatus(SILENT_REFRESH));
        }),
    });
  }, [dispatch, runExclusive]);

  return {
    isPending,
    pendingKind,
    handleToggleBuiltin,
    handleImportFile,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  };
}
