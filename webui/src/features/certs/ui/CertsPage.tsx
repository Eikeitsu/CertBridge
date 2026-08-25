import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
  selectStatusBootstrapped,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { ThemePack } from "@/entities/module/enums";
import { PageStack } from "@/shared/ui/layout";
import { Button, Loader } from "@/shared/ui/primitives";
import { BuiltinCertsPanel } from "./BuiltinCertsPanel";
import { CustomCertsPanel } from "./CustomCertsPanel";
import { HotMountPanel } from "./HotMountPanel";

export function CertsPage() {
  const dispatch = useAppDispatch();
  const isStatusLoading = useAppSelector(selectStatusLoading);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const customCertificates = useAppSelector(selectCustomCertificates);
  const builtinCerts = useBuiltinCerts();
  const { pack, voice } = usePackVoice();
  const showBootSpin = isStatusLoading && !bootstrapped;
  const {
    isPending,
    pendingKind,
    handleToggleBuiltin,
    handleImportFile,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  } = useCertActions();

  if (showBootSpin) return <Loader label={voice.loadingHint} />;

  const builtinVariant =
    pack === ThemePack.Console ? "table" : pack === ThemePack.Studio ? "tiles" : "list";

  const stackClass =
    pack === ThemePack.Studio
      ? "cb-stack--loose"
      : pack === ThemePack.Console
        ? "cb-stack--tight"
        : undefined;

  return (
    <PageStack className={stackClass}>
      {pack === ThemePack.Settings ? (
        <div>
          <h1 className="cb-page-title">{voice.tabs.certs}</h1>
          <p className="cb-page-sub">{voice.certs.builtinMeta}</p>
        </div>
      ) : null}
      <BuiltinCertsPanel
        certs={builtinCerts}
        isPending={isPending}
        pendingKind={pendingKind}
        onToggle={(kind, checked) => void handleToggleBuiltin(kind, checked)}
        title={voice.certs.builtinTitle}
        meta={voice.certs.builtinMeta}
        variant={builtinVariant}
      />
      <CustomCertsPanel
        certificates={customCertificates}
        isPending={isPending}
        onImport={handleImportFile}
        onRemove={handleRemoveCustom}
        title={`${voice.certs.customTitle} (${customCertificates.length})`}
        emptyLabel={voice.certs.customEmpty}
        importLabel={voice.certs.importLabel}
      />
      <HotMountPanel
        busy={isPending}
        title={voice.certs.hotTitle}
        onSetHotAllow={(checked) => void handleSetHotAllow(checked)}
        onMount={handleHotMount}
        onUnmount={handleHotUnmount}
      />
      <Button variant="ghost" onClick={() => void dispatch(refreshStatus(true))}>
        {voice.certs.refresh}
      </Button>
    </PageStack>
  );
}
