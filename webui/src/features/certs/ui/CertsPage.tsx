import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
  selectStatusBootstrapped,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
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

  if (showBootSpin) return <Loader label="加载证书…" />;

  return (
    <PageStack>
      <BuiltinCertsPanel
        certs={builtinCerts}
        isPending={isPending}
        pendingKind={pendingKind}
        onToggle={(kind, checked) => void handleToggleBuiltin(kind, checked)}
      />
      <CustomCertsPanel
        certificates={customCertificates}
        isPending={isPending}
        onImport={handleImportFile}
        onRemove={handleRemoveCustom}
      />
      <HotMountPanel
        busy={isPending}
        onSetHotAllow={(checked) => void handleSetHotAllow(checked)}
        onMount={handleHotMount}
        onUnmount={handleHotUnmount}
      />
      <Button variant="ghost" onClick={() => void dispatch(refreshStatus(true))}>
        刷新证书状态
      </Button>
    </PageStack>
  );
}
