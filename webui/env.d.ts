/// <reference types="vite/client" />

type CertBridgeChromeHost = {
  setInsets?: (css: string) => void;
  setStatusBarColor?: (color: string, light?: boolean) => void;
  setNavigationBarColor?: (color: string, light?: boolean) => void;
  setLightStatusBars?: (light: boolean) => void;
  setLightNavigationBars?: (light: boolean) => void;
  exec?: (cmd: string, optsOrCb: string | object, cb?: string) => void;
  toast?: (msg: string) => void;
};

declare const ksu: CertBridgeChromeHost | undefined;

interface Window {
  $CertBridge?: CertBridgeChromeHost;
  $ksu?: CertBridgeChromeHost;
  mmrl?: CertBridgeChromeHost;
  ksu?: CertBridgeChromeHost;
}
