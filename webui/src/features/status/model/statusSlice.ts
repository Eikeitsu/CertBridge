import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchDeviceLabel,
  fetchStatus,
  listCustom,
  rebootDevice,
  syncAppSources,
} from "@/shared/api/cli";
import { friendlyError } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import type { CustomCertificate, ModuleStatus } from "@/entities/module/types";
import { restoreChromeInsets } from "@/features/theme/lib/chrome";
import { formatClockTime } from "@/shared/lib/clock";

type StatusState = {
  loading: boolean;
  refreshing: boolean;
  status: ModuleStatus;
  customCertificates: CustomCertificate[];
  deviceLabel: string;
  lastRefreshedAt: string;
  error?: string;
};

export type RefreshStatusArg =
  | boolean
  | {
      toast?: boolean;
      syncApps?: boolean;
    }
  | undefined;

function resolveRefreshArg(arg: RefreshStatusArg) {
  if (arg === true) return { toast: true, syncApps: true };
  if (arg && typeof arg === "object") {
    return {
      toast: Boolean(arg.toast),
      syncApps: arg.syncApps !== false,
    };
  }
  return { toast: false, syncApps: true };
}

const initialState: StatusState = {
  loading: true,
  refreshing: false,
  status: {},
  customCertificates: [],
  deviceLabel: "本机",
  lastRefreshedAt: "--",
};

export const bootstrapStatus = createAsyncThunk("status/bootstrap", async () => {
  const [deviceLabel, status, customCertificates] = await Promise.all([
    fetchDeviceLabel().catch(() => "本机"),
    fetchStatus(),
    listCustom().catch(() => [] as CustomCertificate[]),
  ]);
  return { deviceLabel, status, customCertificates };
});

function formatSyncToast(sync: {
  updated: number;
  kept: number;
  miss: number;
  rebootRequired?: boolean;
}): string | null {
  if (sync.updated > 0) {
    return sync.rebootRequired
      ? `已从 App 更新 ${sync.updated} 张证书，重启后生效`
      : `已从 App 更新 ${sync.updated} 张证书`;
  }
  if (sync.miss > 0 && sync.kept === 0 && sync.updated === 0) {
    return "未从 App 读到新证书（已保留现有）";
  }
  return null;
}

export const refreshStatus = createAsyncThunk(
  "status/refresh",
  async (arg: RefreshStatusArg) => {
    const { toast: showToast, syncApps } = resolveRefreshArg(arg);
    const sync = syncApps
      ? await syncAppSources().catch(() => ({
          updated: 0,
          kept: 0,
          miss: 0,
          rebootRequired: false,
        }))
      : { updated: 0, kept: 0, miss: 0, rebootRequired: false };
    const [status, customCertificates] = await Promise.all([
      fetchStatus(),
      listCustom().catch(() => [] as CustomCertificate[]),
    ]);
    if (showToast) {
      toast(formatSyncToast(sync) || "状态已刷新");
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapStatus.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(bootstrapStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.deviceLabel = action.payload.deviceLabel;
        state.status = action.payload.status;
        state.customCertificates = action.payload.customCertificates;
        state.lastRefreshedAt = formatClockTime();
      })
      .addCase(bootstrapStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = friendlyError(action.error.message);
        toast(state.error, "bad");
      })
      .addCase(refreshStatus.pending, (state) => {
        state.refreshing = true;
        if (!state.status.version && !state.status.module_ok) {
          state.loading = true;
        }
      })
      .addCase(refreshStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.status = action.payload.status;
        state.customCertificates = action.payload.customCertificates;
        state.lastRefreshedAt = formatClockTime();
      })
      .addCase(refreshStatus.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        toast(friendlyError(action.error.message), "bad");
      });
  },
});

export const { patchStatus } = statusSlice.actions;

export default statusSlice.reducer;
