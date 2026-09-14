import { useEffect, useState } from "react";
import { bindConfirmHost, type ConfirmRequest } from "@/shared/lib/confirmAction";
import { haptic } from "@/shared/lib/haptic";

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    bindConfirmHost(setRequest);
    return () => bindConfirmHost(null);
  }, []);

  if (!request) return null;

  return (
    <div className="nx-confirm" role="presentation">
      <button
        type="button"
        className="nx-confirm__mask"
        aria-label="关闭"
        onClick={() => {
          haptic("light");
          request.reject();
        }}
      />
      <div
        className={`nx-confirm__sheet${request.danger ? " is-danger" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`nx-confirm-title-${request.id}`}
      >
        <div className="nx-confirm__handle" aria-hidden />
        <h2 id={`nx-confirm-title-${request.id}`} className="nx-confirm__title">
          {request.title}
        </h2>
        <p className="nx-confirm__body">{request.content}</p>
        <div className="nx-confirm__actions">
          <button
            type="button"
            className="nx-confirm__btn is-ghost"
            onClick={() => {
              haptic("light");
              request.reject();
            }}
          >
            {request.cancelText || "取消"}
          </button>
          <button
            type="button"
            className={`nx-confirm__btn is-solid${request.danger ? " is-danger" : ""}`}
            onClick={() => {
              haptic(request.danger ? "error" : "success");
              request.resolve();
            }}
          >
            {request.okText}
          </button>
        </div>
      </div>
    </div>
  );
}
