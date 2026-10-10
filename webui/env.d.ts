/// <reference types="vite/client" />

type CertBridgeChromeHost = {
  setInsets?: (css: string) => void;
  setStatusBarColor?: (color: string, light?: boolean) => void;
  setNavigationBarColor?: (color: string, light?: boolean) => void;
  setLightStatusBars?: (light: boolean) => void;
  setLightNavigationBars?: (light: boolean) => void;
  exec?: (cmd: string, optsOrCb: string | object, cb?: string) => void;
  toast?: (msg: string) => void;
  /** KernelSU / SukiSU WebUI：用户应用包名 JSON 数组 */
  listUserPackages?: () => string;
  listAllPackages?: () => string;
  /** 包信息 JSON（含 appLabel）；参数为包名 JSON 数组字符串 */
  getPackagesInfo?: (pkgsJson: string) => string;
};

declare const ksu: CertBridgeChromeHost | undefined;

interface Window {
  $CertBridge?: CertBridgeChromeHost;
  $ksu?: CertBridgeChromeHost;
  mmrl?: CertBridgeChromeHost;
  ksu?: CertBridgeChromeHost;
}
