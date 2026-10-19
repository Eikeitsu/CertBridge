import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectCustomCertificates } from "@/features/status/model/selectors";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { useCertDetail } from "@/features/certs/hooks/useCertDetail";
import type { AppPresetKind } from "@/shared/api/cli";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export const CERT_PRESET_KINDS: AppPresetKind[] = [
  "httpcanary",
  "adguard",
  "charles",
  "mitmproxy",
  "pcapdroid",
];

/** 三套 pack Certs 页共用的数据与动作 */
export function useCertsPageModel() {
  const { t } = useTranslation("webui");
  const chrome = usePackChrome();
  const dispatch = useAppDispatch();
  const customs = useAppSelector(selectCustomCertificates);
  const builtins = useBuiltinCerts();
  const detail = useCertDetail();
  const v = chrome.certs;
  const actions = useCertActions();

  const statusLabel = (cert: {
    isActive: boolean;
    isEnabled: boolean;
    isAvailable: boolean;
  }) => {
    if (cert.isActive) return t("certs.statusActive");
    if (cert.isEnabled) return t("certs.statusPending");
    if (cert.isAvailable) return t("certs.statusAvailable");
    return t("certs.statusMissing");
  };

  return {
    t,
    chrome,
    dispatch,
    customs,
    builtins,
    detail,
    v,
    statusLabel,
    presetKinds: CERT_PRESET_KINDS,
    ...actions,
  };
}
