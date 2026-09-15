import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { clearLog, readLog } from "@/shared/api/cli";
import { errorFromResult, friendlyError } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { restoreChromeInsets } from "@/features/theme/lib/chrome";
import { LOG_TAIL_LINES } from "@/shared/config/constants";

type LogState = {
  loading: boolean;
  text: string;
  bytes: number;
  lines: number;
};

const initialState: LogState = {
  loading: false,
  text: "暂无日志",
  bytes: 0,
  lines: 0,
};

export const fetchActivityLog = createAsyncThunk("log/fetch", async () => {
  const { text, bytes } = await readLog(LOG_TAIL_LINES);
  const lines = text ? text.split("\n").filter(Boolean).length : 0;
  restoreChromeInsets();
  return {
    text: text || "暂无日志",
    bytes,
    lines,
  };
});

export const clearActivityLog = createAsyncThunk("log/clear", async () => {
  const result = await clearLog();
  if (result.errno !== 0) {
    throw new Error(errorFromResult(result.stdout, result.stderr));
  }
  toast("日志已清空", "ok");
  restoreChromeInsets();
  return true;
});

const logSlice = createSlice({
  name: "log",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivityLog.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActivityLog.fulfilled, (state, action) => {
        state.loading = false;
        state.text = action.payload.text;
        state.bytes = action.payload.bytes;
        state.lines = action.payload.lines;
      })
      .addCase(fetchActivityLog.rejected, (state, action) => {
        state.loading = false;
        state.text = "暂无法读取日志";
        toast(friendlyError(action.error.message), "bad");
      })
      .addCase(clearActivityLog.fulfilled, (state) => {
        state.text = "暂无日志";
        state.bytes = 0;
        state.lines = 0;
      })
      .addCase(clearActivityLog.rejected, (_state, action) => {
        toast(friendlyError(action.error.message), "bad");
      });
  },
});

export default logSlice.reducer;
