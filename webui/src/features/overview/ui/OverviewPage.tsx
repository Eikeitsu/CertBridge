import { useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { ThemePack } from "@/entities/module/enums";
import { Loader } from "@/shared/ui/primitives";
import {
  OverviewConsoleLayout,
  OverviewSettingsLayout,
  OverviewStudioLayout,
} from "./packs/OverviewPackLayouts";

export function OverviewPage() {
  const overview = useTrustOverview();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const { pack, voice } = usePackVoice();
  const showBootSpin = overview.isLoading && !bootstrapped;

  if (showBootSpin) return <Loader label={voice.loadingHint} />;

  if (pack === ThemePack.Console) {
    return <OverviewConsoleLayout overview={overview} voice={voice} />;
  }
  if (pack === ThemePack.Studio) {
    return <OverviewStudioLayout overview={overview} voice={voice} />;
  }
  return <OverviewSettingsLayout overview={overview} voice={voice} />;
}
