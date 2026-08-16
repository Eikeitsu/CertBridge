import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectStatusBootstrapped,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { selectThemePack } from "@/features/theme/model/selectors";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useCertDetail } from "@/features/certs/hooks/useCertDetail";
import { getPackVoice } from "@/shared/config/packVoice";
import { Loader } from "@/shared/ui/Loader";
import { PageRefresh } from "@/shared/ui/PageRefresh";
import { BuiltinCertsGroup } from "./BuiltinCertsGroup";
import { CustomCertsGroup } from "./CustomCertsGroup";
import { HotMountPanel } from "./HotMountPanel";
import { CertsTips } from "./CertsTips";
import { CertDetailSheet } from "./CertDetailSheet";

export function CertsPage() {
  const dispatch = useAppDispatch();
  const pack = useAppSelector(selectThemePack);
  const voice = getPackVoice(pack);
  const isStatusLoading = useAppSelector(selectStatusLoading);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
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
  const {
    isOpen,
    loading: isDetailLoading,
    title,
    sourceId,
    fields,
    openDetail,
    closeDetail,
  } = useCertDetail();

  return (
    <div className={`certs-page pack-${pack}${showBootSpin ? " is-loading" : ""}`}>
      {showBootSpin ? (
        <div className="ov-boot">
          <Loader label={voice.loadingHint} />
        </div>
      ) : null}
      <PageRefresh onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        <BuiltinCertsGroup
          title={voice.certPermanent}
          pendingKind={pendingKind}
          onOpenDetail={(id, name) => void openDetail(id, name)}
          onToggle={(kind, checked) => void handleToggleBuiltin(kind, checked)}
        />
        <CustomCertsGroup
          title={voice.certCustom}
          onImport={(file) => void handleImportFile(file)}
          onOpenDetail={(id, name) => void openDetail(id, name)}
          onRemove={handleRemoveCustom}
        />
        <HotMountPanel
          sectionLabel={voice.certSession}
          panelTitle={voice.hotMountTitle}
          panelMeta={voice.hotMountMeta}
          busy={isPending}
          onSetHotAllow={(checked) => void handleSetHotAllow(checked)}
          onMount={handleHotMount}
          onUnmount={handleHotUnmount}
        />
        <CertsTips />
      </PageRefresh>
      <CertDetailSheet
        open={isOpen}
        title={title}
        sourceId={sourceId}
        fields={fields}
        loading={isDetailLoading}
        onClose={closeDetail}
      />
    </div>
  );
}
