import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectStatusLoading } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { selectThemePack } from "@/features/theme/model/selectors";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useCertDetail } from "@/features/certs/hooks/useCertDetail";
import { getPackVoice } from "@/shared/config/packVoice";
import { PageRefresh, PageSpin, SectionLabel } from "@/shared/ui";
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
  const {
    isPending,
    handleToggleBuiltin,
    handleImportFile,
    handleRemoveCustom,
    handleHotMount,
    handleHotUnmount,
  } = useCertActions();
  const {
    isOpen,
    loading: isDetailLoading,
    title,
    fields,
    openDetail,
    closeDetail,
  } = useCertDetail();

  return (
    <PageSpin spinning={isStatusLoading || isPending}>
      <PageRefresh onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        <SectionLabel>{voice.certPermanent}</SectionLabel>
        <BuiltinCertsGroup
          onOpenDetail={(id, name) => void openDetail(id, name)}
          onToggle={(kind, checked) => void handleToggleBuiltin(kind, checked)}
        />
        <CustomCertsGroup
          onImport={(file) => void handleImportFile(file)}
          onOpenDetail={(id, name) => void openDetail(id, name)}
          onRemove={handleRemoveCustom}
        />
        <HotMountPanel
          sectionLabel={voice.certSession}
          panelTitle={voice.hotMountTitle}
          onMount={handleHotMount}
          onUnmount={handleHotUnmount}
        />
        <CertsTips />
      </PageRefresh>
      <CertDetailSheet
        open={isOpen}
        title={title}
        fields={fields}
        loading={isDetailLoading}
        onClose={closeDetail}
      />
    </PageSpin>
  );
}
