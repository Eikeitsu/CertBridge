import type { CSSProperties, ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { Loader } from "./Loader";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  /** 解析中等：叠在内容上，不卸载 children，避免闪一下 */
  loading?: boolean;
  loadingLabel?: string;
  /** 默认占满高度；confirm 用 auto */
  height?: string | "auto";
  title?: string;
  /** sheet = 详情抽屉；confirm = 确认条（同主题 chrome） */
  variant?: "sheet" | "confirm";
  danger?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  loading = false,
  loadingLabel,
  height = "min(92dvh, 860px)",
  title,
  variant = "sheet",
  danger = false,
  footer,
  children,
}: BottomSheetProps) {
  const { t } = useTranslation("webui");
  const resolvedTitle = title ?? t("ui.detail");
  const resolvedLoading = loadingLabel ?? t("ui.loading");
  const autoHeight = height === "auto" || variant === "confirm";
  const sheetStyle = {
    ["--bf-sheet-h" as string]: autoHeight ? "auto" : height,
  } as CSSProperties;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <div className={`bf-sheet-overlay${variant === "confirm" ? " is-confirm" : ""}`}>
          <Dialog.Overlay className="bf-sheet-overlay__mask" />
          <Dialog.Content
            className={`bf-sheet${variant === "confirm" ? " is-confirm" : ""}${
              danger ? " is-danger" : ""
            }${autoHeight ? " is-auto" : ""}`}
            style={sheetStyle}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <div className="bf-sheet__chrome">
              <div className="bf-sheet__handle" aria-hidden />
              <div className="bf-sheet__bar">
                <Dialog.Title className="bf-sheet__bar-title">
                  {resolvedTitle}
                </Dialog.Title>
                {variant === "sheet" ? (
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="bf-sheet__close"
                      aria-label={t("ui.close")}
                    />
                  </Dialog.Close>
                ) : (
                  <span className="bf-sheet__bar-spacer" aria-hidden />
                )}
              </div>
            </div>
            <div className="bf-sheet__scroll">
              <div
                className={`bf-sheet__body${loading ? " is-busy" : ""}`}
                aria-busy={loading || undefined}
              >
                {children}
              </div>
              {loading ? (
                <div className="bf-sheet__loading" role="status">
                  <Loader label={resolvedLoading} />
                </div>
              ) : null}
            </div>
            {footer ? <div className="bf-sheet__footer">{footer}</div> : null}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
