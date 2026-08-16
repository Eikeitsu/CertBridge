import { NoticeBar, Tabs, Tag } from "antd-mobile";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
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
import { useBuiltinCerts } from "../hooks/useBuiltinCerts";

export function CertsPage() {
  const dispatch = useAppDispatch();
  const pack = useAppSelector(selectThemePack);
  const voice = getPackVoice(pack);
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
  const {
    isOpen,
    loading: isDetailLoading,
    title,
    sourceId,
    fields,
    openDetail,
    closeDetail,
  } = useCertDetail();

  const enabledCount = builtinCerts.filter((item) => item.isEnabled).length;
  const activeCount = builtinCerts.filter((item) => item.isActive).length;

  return (
    <div className={`certs-page pack-${pack}${showBootSpin ? " is-loading" : ""}`}>
      {showBootSpin ? (
        <div className="ov-boot">
          <Loader label={voice.loadingHint} />
        </div>
      ) : null}
      <PageRefresh onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        <NoticeBar
          color="info"
          wrap
          content={`永久 ${enabledCount} 启用 / ${activeCount} 生效 · 自定义 ${customCertificates.length} · ${voice.hotMountMeta}`}
        />

        <div className="certs-summary">
          <Tag color="primary" fill="outline" round>
            {voice.certPermanent}
          </Tag>
          <Tag color="success" fill="outline" round>
            生效 {activeCount}
          </Tag>
          <Tag color="warning" fill="outline" round>
            自定义 {customCertificates.length}
          </Tag>
        </div>

        <Tabs className="certs-tabs">
          <Tabs.Tab title={voice.certPermanent} key="perm">
            <BuiltinCertsGroup
              title={voice.certPermanent}
              pendingKind={pendingKind}
              onOpenDetail={(id, name) => void openDetail(id, name)}
              onToggle={(kind, checked) => void handleToggleBuiltin(kind, checked)}
            />
            <CertsTips />
          </Tabs.Tab>
          <Tabs.Tab
            title={`${voice.certCustom}(${customCertificates.length})`}
            key="custom"
          >
            <CustomCertsGroup
              title={voice.certCustom}
              onImport={(file) => void handleImportFile(file)}
              onOpenDetail={(id, name) => void openDetail(id, name)}
              onRemove={handleRemoveCustom}
            />
          </Tabs.Tab>
          <Tabs.Tab title={voice.certSession} key="hot">
            <HotMountPanel
              sectionLabel={voice.certSession}
              panelTitle={voice.hotMountTitle}
              panelMeta={voice.hotMountMeta}
              busy={isPending}
              onSetHotAllow={(checked) => void handleSetHotAllow(checked)}
              onMount={handleHotMount}
              onUnmount={handleHotUnmount}
            />
          </Tabs.Tab>
        </Tabs>
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
