import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";

type ImagePreviewProps = {
  open: boolean;
  onClose: () => void;
  src: string;
  title: string;
  alt?: string;
};

export function ImagePreview({ open, onClose, src, title, alt }: ImagePreviewProps) {
  const { t } = useTranslation("webui");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="bf-img-preview">
          <Dialog.Overlay asChild>
            <button
              type="button"
              className="bf-img-preview__mask"
              aria-label={t("ui.closePreview")}
              onClick={onClose}
            />
          </Dialog.Overlay>
          <Dialog.Content
            className="bf-img-preview__panel"
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className="bf-img-preview__bar">
              <Dialog.Title className="bf-img-preview__title">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="bf-img-preview__close"
                  aria-label={t("ui.close")}
                >
                  {t("ui.close")}
                </button>
              </Dialog.Close>
            </div>
            <div className="bf-img-preview__body">
              <img src={src} alt={alt || title} className="bf-img-preview__img" />
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
