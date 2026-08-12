import type { RootState } from "@/app/store";

export const selectActivityLog = (state: RootState) => state.log;
