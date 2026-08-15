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
import { NxPull, NxSection, NxSpin } from "@/shared/ui";
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
    <NxSpin spinning={showBootSpin} label={voice.loadingHint}>
      <NxPull onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        <NxSection eyebrow="Permanent" title={voice.certPermanent}>
          <BuiltinCertsGroup
            pendingKind={pendingKind}
            onOpenDetail={(id, name) => void openDetail(id, name)}
            onToggle={(kind, checked) => void handleToggleBuiltin(kind, checked)}
          />
        </NxSection>
        <CustomCertsGroup
          onImport={(file) => void handleImportFile(file)}
          onOpenDetail={(id, name) => void openDetail(id, name)}
          onRemove={handleRemoveCustom}
        />
        <HotMountPanel
          sectionLabel={voice.certSession}
          panelTitle={voice.hotMountTitle}
          busy={isPending}
          onSetHotAllow={(checked) => void handleSetHotAllow(checked)}
          onMount={handleHotMount}
          onUnmount={handleHotUnmount}
        />
        <CertsTips />
      </NxPull>
      <CertDetailSheet
        open={isOpen}
        title={title}
        sourceId={sourceId}
        fields={fields}
        loading={isDetailLoading}
        onClose={closeDetail}
      />
    </NxSpin>
  );
}
