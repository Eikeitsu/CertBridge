import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "@/features/theme/model/themeSlice";
import statusReducer from "@/features/status/model/statusSlice";
import logReducer from "@/features/log/model/logSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    status: statusReducer,
    log: logReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
