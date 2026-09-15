import { useAppSelector } from "@/app/store/hooks";
import { selectThemePack } from "@/features/theme/model/selectors";
import { ThemePack } from "@/entities/module/enums";
import { DefaultShell } from "@/packs/default/Shell";
import { ConsoleShell } from "@/packs/console/Shell";

/** 按主题包整树切换，避免样式/结构串台 */
export function PackRoot() {
  const pack = useAppSelector(selectThemePack);
  if (pack === ThemePack.Console) {
    return <ConsoleShell key="console" />;
  }
  return <DefaultShell key="default" />;
}
