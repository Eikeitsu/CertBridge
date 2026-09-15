import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader } from "./Loader";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  height?: string;
  title?: string;
  children: ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  loading,
  height = "min(92dvh, 860px)",
  title = "详情",
  children,
}: BottomSheetProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="bf-sheet-overlay">
          <Dialog.Overlay asChild>
            <button type="button" className="bf-sheet-overlay__mask" aria-label="关闭" />
          </Dialog.Overlay>
          <Dialog.Content
            className="bf-sheet"
            style={{ height }}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className="bf-sheet__chrome">
              <div className="bf-sheet__handle" aria-hidden />
              <div className="bf-sheet__bar">
                <Dialog.Title className="bf-sheet__bar-title">{title}</Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" className="bf-sheet__close" aria-label="关闭" />
                </Dialog.Close>
              </div>
            </div>
            <div className="bf-sheet__scroll">
              {loading ? (
                <div className="bf-spin__mask is-embedded">
                  <Loader label="正在解析证书" />
                </div>
              ) : (
                children
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
