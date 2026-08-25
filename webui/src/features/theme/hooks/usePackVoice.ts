import { useAppSelector } from "@/app/store/hooks";
import { selectThemePack } from "@/features/theme/model/selectors";
import { getPackVoice } from "@/shared/config/packVoice";

export function usePackVoice() {
  const pack = useAppSelector(selectThemePack);
  return { pack, voice: getPackVoice(pack) };
}
