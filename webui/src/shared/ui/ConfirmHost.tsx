import { useEffect, useState } from "react";
import { bindConfirmHost, type ConfirmRequest } from "@/shared/lib/confirmAction";
import { haptic } from "@/shared/lib/haptic";
import { BottomSheet } from "./BottomSheet";

/** 关闭动画时长，需与 sheet.scss confirm-out 对齐 */
const CONFIRM_EXIT_MS = 280;

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    bindConfirmHost((next) => {
      if (next) {
        setRequest(next);
        setOpen(true);
        return;
      }
      // 先关抽屉播退场，再清内容，避免瞬间消失
      setOpen(false);
    });
    return () => bindConfirmHost(null);
  }, []);

  useEffect(() => {
    if (open || !request) return;
    const timer = window.setTimeout(() => setRequest(null), CONFIRM_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, request]);

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        haptic("light");
        request?.reject();
      }}
      title={request?.title || "确认"}
      variant="confirm"
      danger={Boolean(request?.danger)}
      height="auto"
      footer={
        request ? (
          <div className="bf-sheet__actions">
            <button
              type="button"
              className="bf-sheet__btn is-ghost"
              onClick={() => {
                haptic("light");
                request.reject();
              }}
            >
              {request.cancelText || "取消"}
            </button>
            <button
              type="button"
              className={`bf-sheet__btn is-solid${request.danger ? " is-danger" : ""}`}
              onClick={() => {
                haptic(request.danger ? "error" : "success");
                request.resolve();
              }}
            >
              {request.okText}
            </button>
          </div>
        ) : null
      }
    >
      {request ? <p className="bf-sheet__copy">{request.content}</p> : null}
    </BottomSheet>
  );
}
