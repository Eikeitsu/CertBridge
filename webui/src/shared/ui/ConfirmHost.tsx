import { useEffect, useState } from "react";
import { bindConfirmHost, type ConfirmRequest } from "@/shared/lib/confirmAction";
import { haptic } from "@/shared/lib/haptic";
import { BottomSheet } from "./BottomSheet";

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    bindConfirmHost(setRequest);
    return () => bindConfirmHost(null);
  }, []);

  const open = Boolean(request);

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
