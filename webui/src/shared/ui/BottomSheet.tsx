import type { ReactNode } from "react";
import { Button, Popup, SpinLoading } from "antd-mobile";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  height?: string;
  children: ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  loading,
  height = "min(92dvh, 860px)",
  children,
}: BottomSheetProps) {
  return (
    <Popup
      visible={open}
      onClose={onClose}
      onMaskClick={onClose}
      position="bottom"
      destroyOnClose
      bodyClassName="cb-sheet"
      bodyStyle={{
        height,
        borderTopLeftRadius: "var(--cb-radius-lg)",
        borderTopRightRadius: "var(--cb-radius-lg)",
        background: "var(--cb-chrome)",
        overflow: "auto",
        padding: "8px 16px calc(16px + var(--cb-inset-bottom))",
      }}
    >
      <div className="cb-sheet__handle" aria-hidden />
      {loading ? (
        <div className="cb-spin__mask is-embedded">
          <SpinLoading color="primary" />
        </div>
      ) : (
        children
      )}
      <div className="cb-sheet__foot">
        <Button block onClick={onClose}>
          关闭
        </Button>
      </div>
    </Popup>
  );
}
