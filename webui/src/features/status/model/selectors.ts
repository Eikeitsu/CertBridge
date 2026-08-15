import type { RootState } from "@/app/store";

export const selectModuleStatus = (state: RootState) => state.status.status;

export const selectCustomCertificates = (state: RootState) =>
  state.status.customCertificates;

export const selectStatusLoading = (state: RootState) => state.status.loading;

export const selectStatusBootstrapped = (state: RootState) => state.status.bootstrapped;

export const selectStatusRefreshing = (state: RootState) => state.status.refreshing;

export const selectHasModuleStatus = (state: RootState) =>
  Boolean(state.status.status.version || state.status.status.module_ok);

export const selectDeviceLabel = (state: RootState) => state.status.deviceLabel;

export const selectLastRefreshedAt = (state: RootState) => state.status.lastRefreshedAt;

export const selectStatusError = (state: RootState) => state.status.error;
