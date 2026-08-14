import { useCallback } from "react";
import { useAppDispatch } from "@/app/store/hooks";
import { refreshStatus } from "@/features/status/model/statusSlice";
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

export function useCertActions() {
  const dispatch = useAppDispatch();
  const { isPending, runExclusive } = useAsyncLock();

  const refresh = useCallback(async () => {
    await dispatch(refreshStatus(false));
  }, [dispatch]);

  const handleToggleBuiltin = useCallback(
    async (kind: BuiltinCertKind, checked: boolean) => {
      await runExclusive(async () => {
        const result = await toggleBuiltin(kind, checked ? FLAG_ON : FLAG_OFF);
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr));
          return;
        }
        const kv = parseKv(result.stdout || "");
        toastByRebootFlag(
          kv,
          checked ? "已开启，重启后生效" : "已关闭，重启后移除",
          checked ? "已开启（与当前生效一致）" : "已关闭（与当前生效一致）",
        );
        await refresh();
      });
    },
    [refresh, runExclusive],
  );

  const handleImportFile = useCallback(
    async (file: File) => {
      await runExclusive(async () => {
        try {
          const payload = await fileToBase64(file);
          const result = await installCustom(payload);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr));
            return;
          }
          const kv = parseKv(result.stdout || "");
          toastByRebootFlag(kv, "已导入，重启后生效", "已导入（无需重启）");
          await refresh();
        } catch {
          toast("读取文件失败");
        }
      });
      return false;
    },
    [refresh, runExclusive],
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
            toast(errorFromResult(result.stdout, result.stderr));
            return;
          }
          const kv = parseKv(result.stdout || "");
          toastByRebootFlag(kv, "已移除，重启后生效", "已移除（与当前生效一致）");
          await refresh();
        },
      });
    },
    [refresh],
  );

  const handleSetHotAllow = useCallback(
    (checked: boolean) => {
      const apply = () =>
        runExclusive(async () => {
          const result = await setHotAllow(checked ? FLAG_ON : FLAG_OFF);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr));
            await refresh();
            return;
          }
          toast(
            checked
              ? "已允许手动临时挂载"
              : "已关闭临时挂载",
          );
          await refresh();
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
    [refresh, runExclusive],
  );

  const handleHotMount = useCallback(
    (mode: HotMountMode, sdPath?: string) => {
      if (mode !== HotMountMode.User && !isSafeSdPath(sdPath || "")) {
        toast("存储卡路径不安全或不受支持");
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
              toast(errorFromResult(result.stdout, result.stderr));
              await refresh();
              return;
            }
            const addedCount = fields.hot_added || "0";
            const failedCount = Number(fields.hot_failed || 0);
            toast(
              failedCount > 0
                ? `已挂载 ${addedCount} 张，${failedCount} 个会话未覆盖`
                : `已免重启挂载 ${addedCount} 张证书`,
            );
            await refresh();
          }),
      });
    },
    [refresh, runExclusive],
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
            );
            await refresh();
            return;
          }
          toast("临时证书已无痕卸载");
          await refresh();
        }),
    });
  }, [refresh, runExclusive]);

  return {
    isPending,
    handleToggleBuiltin,
    handleImportFile,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  };
}
