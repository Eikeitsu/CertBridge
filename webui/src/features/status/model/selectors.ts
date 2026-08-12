import type { RootState } from "@/app/store";

export const selectModuleStatus = (state: RootState) => state.status.status;

export const selectCustomCertificates = (state: RootState) =>
  state.status.customCertificates;

export const selectStatusLoading = (state: RootState) => state.status.loading;

export const selectDeviceLabel = (state: RootState) => state.status.deviceLabel;

export const selectLastRefreshedAt = (state: RootState) => state.status.lastRefreshedAt;

export const selectStatusError = (state: RootState) => state.status.error;
