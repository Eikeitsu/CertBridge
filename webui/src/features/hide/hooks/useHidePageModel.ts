import { useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { useHideAllow } from "@/features/hide/hooks/useHideAllow";
import { useZnHideAllow } from "@/features/hide/hooks/useZnHideAllow";
import { useEnsureHideStatus } from "@/features/hide/hooks/useEnsureHideStatus";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

/** 三套 pack Hide 页共用的数据与开关逻辑 */
export function useHidePageModel() {
  const chrome = usePackChrome();
  const hide = useHideAllow();
  const zn = useZnHideAllow();
  useEnsureHideStatus();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const anyHide = hide.hideSupported || zn.znHideSupported;

  return { chrome, hide, zn, bootstrapped, h, anyHide };
}
