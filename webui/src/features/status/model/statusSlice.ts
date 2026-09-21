import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchDeviceInfo,
  fetchStatus,
  listCustom,
  rebootDevice,
  syncAppSources,
} from "@/shared/api/cli";
import { friendlyError } from "@/shared/api/errors";
import { hasBridge, toast } from "@/shared/api/ksu";
import type { CustomCertificate, ModuleStatus } from "@/entities/module/types";
import { restoreChromeInsets } from "@/features/theme/lib/chrome";
import { formatClockTime } from "@/shared/lib/clock";
import { FLAG_ON } from "@/shared/config/constants";

type StatusState = {
  loading: boolean;
  refreshing: boolean;
  bootstrapped: boolean;
  status: ModuleStatus;
  customCertificates: CustomCertificate[];
  /** 顶栏：机型 · 系统 */
  deviceLabel: string;
  /** 运行环境「设备」：仅机型 */
  deviceName: string;
  lastRefreshedAt: string;
  error?: string;
};

export type RefreshStatusArg =
  | boolean
  | {
      toast?: boolean;
      syncApps?: boolean;
      /** 强制实测注入状态并回写缓存（首页刷新 / 稳定中自愈） */
      live?: boolean;
    }
  | undefined;

function resolveRefreshArg(arg: RefreshStatusArg) {
  if (arg === true) return { toast: true, syncApps: true, live: true };
  if (arg && typeof arg === "object") {
    return {
      toast: Boolean(arg.toast),
      syncApps: arg.syncApps !== false,
      live: Boolean(arg.live),
    };
  }
  return { toast: false, syncApps: true, live: false };
}

/** CLI 回包里的 reboot_required → pending_reboot，并过滤非状态键 */
export function normalizeCliStatusPatch(
  kv: Record<string, string>,
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(kv)) {
    if (!key || key === "ok" || key === "error" || key === "hint" || key === "filename")
      continue;
    if (key === "reboot_required") {
      patch.pending_reboot = value === FLAG_ON || value === "1" ? "1" : "0";
      continue;
    }
    patch[key] = value;
  }
  return patch;
}

const initialState: StatusState = {
  loading: true,
  refreshing: false,
  bootstrapped: false,
  status: {},
  customCertificates: [],
  deviceLabel: "本机",
  deviceName: "本机",
  lastRefreshedAt: "--",
};

export const bootstrapStatus = createAsyncThunk("status/bootstrap", async () => {
  // 部分管理器（SukiSU 等）注入 ksu 略晚于首屏 JS：短轮询，避免固定 ~400ms 空等
  if (!hasBridge()) {
    for (let i = 0; i < 4 && !hasBridge(); i += 1) {
      await new Promise((r) => window.setTimeout(r, 40 + i * 40));
    }
  }
  // 首屏只拉 status，尽快进页面；设备名 / 自定义列表后台补
  const status = await fetchStatus();
  return { status };
});

/** 非阻塞补齐：设备文案 + 自定义证书列表 */
export const enrichBootstrapMeta = createAsyncThunk("status/enrichMeta", async () => {
  const [device, customCertificates] = await Promise.all([
    fetchDeviceInfo().catch(() => ({ label: "本机", name: "本机" })),
    listCustom().catch(() => [] as CustomCertificate[]),
  ]);
  return {
    deviceLabel: device.label,
    deviceName: device.name,
    customCertificates,
  };
});

function formatSyncToast(sync: {
  updated: number;
  kept: number;
  miss: number;
  rebootRequired?: boolean;
}): string | null {
  if (sync.updated > 0) {
    return sync.rebootRequired
      ? `已从 App 更新 ${sync.updated} 张证书（含可选自定义），重启后生效`
      : `已从 App 更新 ${sync.updated} 张证书（含可选自定义）`;
  }
  if (sync.miss > 0 && sync.kept === 0 && sync.updated === 0) {
    return "未从 App 读到新证书（已保留现有）";
  }
  return null;
}

export const refreshStatus = createAsyncThunk(
  "status/refresh",
  async (arg: RefreshStatusArg) => {
    const { toast: showToast, syncApps, live } = resolveRefreshArg(arg);
    const sync = syncApps
      ? await syncAppSources().catch(() => ({
          updated: 0,
          kept: 0,
          miss: 0,
          rebootRequired: false,
        }))
      : { updated: 0, kept: 0, miss: 0, rebootRequired: false };
    const [status, customCertificates] = await Promise.all([
      fetchStatus(live),
      listCustom().catch(() => [] as CustomCertificate[]),
    ]);
    if (showToast) {
      toast(formatSyncToast(sync) || (live ? "已复核注入状态" : "状态已刷新"));
    }
    restoreChromeInsets();
    return { status, customCertificates };
  },
);

export const requestReboot = createAsyncThunk("status/reboot", async () => {
  toast("正在重启…", "warn");
  await rebootDevice();
});

const statusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {
    patchStatus(state, action: PayloadAction<Record<string, string>>) {
      state.status = { ...state.status, ...action.payload };
    },
    mergeStatus(state, action: PayloadAction<Record<string, string>>) {
      const patch = normalizeCliStatusPatch(action.payload);
      if (Object.keys(patch).length === 0) return;
      state.status = { ...state.status, ...patch };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapStatus.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(bootstrapStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.bootstrapped = true;
        state.status = action.payload.status;
        state.lastRefreshedAt = formatClockTime();
      })
      .addCase(bootstrapStatus.rejected, (state, action) => {
        state.loading = false;
        state.bootstrapped = true;
        state.error = friendlyError(action.error.message);
        toast(state.error, "bad");
      })
      .addCase(enrichBootstrapMeta.fulfilled, (state, action) => {
        state.deviceLabel = action.payload.deviceLabel;
        state.deviceName = action.payload.deviceName;
        state.customCertificates = action.payload.customCertificates;
      })
      .addCase(refreshStatus.pending, (state) => {
        state.refreshing = true;
        // 已有数据时绝不整页 loading，避免开关/配置变更卡顿感
      })
      .addCase(refreshStatus.fulfilled, (state, action) => {
        state.refreshing = false;
        state.status = action.payload.status;
        state.customCertificates = action.payload.customCertificates;
        state.lastRefreshedAt = formatClockTime();
      })
      .addCase(refreshStatus.rejected, (state, action) => {
        state.refreshing = false;
        toast(friendlyError(action.error.message), "bad");
      });
  },
});

export const { patchStatus, mergeStatus } = statusSlice.actions;

export default statusSlice.reducer;
