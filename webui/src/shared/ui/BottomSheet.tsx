import type { ReactNode } from "react";
import { Popup } from "antd-mobile";
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
    <Popup
      visible={open}
      onClose={onClose}
      onMaskClick={onClose}
      position="bottom"
      destroyOnClose
      bodyClassName="cb-sheet"
      bodyStyle={{
        height,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderTopLeftRadius: "var(--cb-radius-lg)",
        borderTopRightRadius: "var(--cb-radius-lg)",
        background: "var(--cb-chrome)",
        padding: 0,
      }}
    >
      <div className="cb-sheet__chrome">
        <div className="cb-sheet__handle" aria-hidden />
        <div className="cb-sheet__bar">
          <span className="cb-sheet__bar-title">{title}</span>
          <button
            type="button"
            className="cb-sheet__close"
            onClick={onClose}
            aria-label="关闭"
          />
        </div>
      </div>
      <div className="cb-sheet__scroll">
        {loading ? (
          <div className="cb-spin__mask is-embedded">
            <Loader label="正在解析证书" />
          </div>
        ) : (
          children
        )}
      </div>
    </Popup>
  );
}
