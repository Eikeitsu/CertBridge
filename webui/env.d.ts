/// <reference types="vite/client" />

declare const ksu:
  | {
      exec: (cmd: string, optsOrCb: string | object, cb?: string) => void;
      toast?: (msg: string) => void;
    }
  | undefined;

interface Window {
  $CertBridge?: {
    setInsets?: (css: string) => void;
    setStatusBarColor?: (color: string, light?: boolean) => void;
    setNavigationBarColor?: (color: string, light?: boolean) => void;
  };
  mmrl?: Window["$CertBridge"];
}
