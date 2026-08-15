import { haptic } from "@/shared/lib/haptic";

export type ConfirmActionOptions = {
  title: string;
  content: string;
  okText: string;
  cancelText?: string;
  danger?: boolean;
  onOk: () => unknown;
};

export type ConfirmRequest = ConfirmActionOptions & {
  id: number;
  resolve: () => void;
  reject: () => void;
};

type ConfirmListener = (request: ConfirmRequest | null) => void;

let listener: ConfirmListener | null = null;
let seq = 0;
let current: ConfirmRequest | null = null;

export function bindConfirmHost(next: ConfirmListener | null) {
  listener = next;
  if (next && current) next(current);
}

export function confirmAction(options: ConfirmActionOptions) {
  haptic("medium");
  const id = ++seq;
  return new Promise<void>((resolve) => {
    const request: ConfirmRequest = {
      ...options,
      cancelText: options.cancelText || "取消",
      id,
      resolve: () => {
        if (current?.id !== id) return;
        current = null;
        listener?.(null);
        resolve();
        void Promise.resolve(options.onOk());
      },
      reject: () => {
        if (current?.id !== id) return;
        current = null;
        listener?.(null);
        resolve();
      },
    };
    current = request;
    listener?.(request);
  });
}
