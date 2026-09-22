import { usePackCopy } from "@/features/theme/ui/PackCopyProvider";

/** Pack chrome strings (tabs / page titles) from i18n */
export function usePackChrome() {
  return usePackCopy().chrome;
}
