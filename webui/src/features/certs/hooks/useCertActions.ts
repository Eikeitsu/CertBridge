import { useCallback } from "react";
import { Modal } from "antd";
import { useAppDispatch } from "@/app/store/hooks";
import { refreshStatus } from "@/features/status/model/statusSlice";
import {
  hotMount,
  hotUnmount,
  installCustom,
  removeCustom,
  toggleBuiltin,
} from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { fileToBase64, parseKv } from "@/shared/lib/parse";
import { isSafeSdPath } from "@/shared/lib/sdPath";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import type { BuiltinCertKind, HotMountMode } from "@/entities/module/types";

const HOT_MOUNT_LABEL: Record<HotMountMode, string> = {
  user: "用户凭据区",
  sd: "存储卡目录",
  all: "用户凭据区与存储卡目录",
};

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
        toast(checked ? "已开启，重启后生效" : "已关闭，重启后移除");
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
          toast("已导入，重启后生效");
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
      Modal.confirm({
        title: "移除自定义证书？",
        content: "重启后才会从系统信任库撤下。",
        okText: "移除",
        cancelText: "取消",
        onOk: async () => {
          const result = await removeCustom(fileName);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr));
            return;
          }
          toast("已移除，重启后生效");
          await refresh();
        },
      });
    },
    [refresh],
  );

  const handleHotMount = useCallback(
    (mode: HotMountMode, sdPath?: string) => {
      if (mode !== "user" && !isSafeSdPath(sdPath || "")) {
        toast("存储卡路径不安全或不受支持");
        return;
      }

      Modal.confirm({
        title: `立即挂载${HOT_MOUNT_LABEL[mode]}中的有效 CA？`,
        content: "无需重启，仅建立临时会话；重启后自动失效。",
        okText: "挂载",
        cancelText: "取消",
        onOk: () =>
          runExclusive(async () => {
            toast("正在建立临时证书会话…");
            const result = await hotMount(
              mode,
              mode === "user" ? undefined : sdPath?.trim(),
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
    Modal.confirm({
      title: "无痕卸载当前临时证书会话？",
      content: "永久配置与系统文件不会改变。",
      okText: "卸载",
      cancelText: "取消",
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
    handleHotMount,
    handleHotUnmount,
  };
}
