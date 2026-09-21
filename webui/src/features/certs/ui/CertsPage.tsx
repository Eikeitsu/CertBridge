import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
  selectStatusBootstrapped,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { useCertDetail } from "@/features/certs/hooks/useCertDetail";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { PageStack } from "@/shared/ui/layout";
import { Button, Loader } from "@/shared/ui/primitives";
import { BuiltinCertsPanel } from "./BuiltinCertsPanel";
import { CustomCertsPanel } from "./CustomCertsPanel";
import { CertDetailSheet } from "./CertDetailSheet";
import { HotMountPanel } from "./HotMountPanel";

export function CertsPage() {
  const dispatch = useAppDispatch();
  const isStatusLoading = useAppSelector(selectStatusLoading);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const customCertificates = useAppSelector(selectCustomCertificates);
  const builtinCerts = useBuiltinCerts();
  const { voice } = usePackVoice();
  const detail = useCertDetail();
  const showBootSpin = isStatusLoading && !bootstrapped;
  const {
    isPending,
    handleToggleBuiltin,
    handleImportFile,
    handleImportPreset,
    handleExportFingerprints,
    handleRemoveCustom,
    handleSetHotAllow,
    handleHotMount,
    handleHotUnmount,
  } = useCertActions();

  if (showBootSpin) return <Loader label={voice.loadingHint} />;

  return (
    <PageStack className="bf-stack--loose">
      <div>
        <h1 className="bf-page-title">{voice.tabs.certs}</h1>
        <p className="bf-page-sub">{voice.certs.builtinMeta}</p>
      </div>
      <BuiltinCertsPanel
        certs={builtinCerts}
        onToggle={(kind, checked) => void handleToggleBuiltin(kind, checked)}
        onOpenDetail={(id, title) => void detail.openDetail(id, title)}
        title={voice.certs.builtinTitle}
        meta={voice.certs.builtinMeta}
        variant="list"
        detailLabel={voice.certs.detailLabel}
      />
      <CustomCertsPanel
        certificates={customCertificates}
        isPending={isPending}
        onImport={handleImportFile}
        onImportPreset={handleImportPreset}
        onExportFingerprints={handleExportFingerprints}
        onRemove={handleRemoveCustom}
        onOpenDetail={(id, title) => void detail.openDetail(id, title)}
        title={`${voice.certs.customTitle} (${customCertificates.length})`}
        emptyLabel={voice.certs.customEmpty}
        importLabel={voice.certs.importLabel}
        detailLabel={voice.certs.detailLabel}
        presetsTitle={voice.certs.presetsTitle}
        presetsMeta={voice.certs.presetsMeta}
        exportFpsLabel={voice.certs.exportFps}
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
      <CertDetailSheet
        open={detail.isOpen}
        title={detail.title}
        sourceId={detail.sourceId}
        fields={detail.fields}
        loading={detail.loading}
        onClose={detail.closeDetail}
      />
    </PageStack>
  );
}
