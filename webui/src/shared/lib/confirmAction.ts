import { Dialog } from "antd-mobile";
import { haptic } from "@/shared/lib/haptic";

type ConfirmActionOptions = {
  title: string;
  content: string;
  okText: string;
  danger?: boolean;
  onOk: () => unknown;
};

export function confirmAction({
  title,
  content,
  okText,
  danger,
  onOk,
}: ConfirmActionOptions) {
  haptic("medium");
  void Dialog.show({
    title,
    content,
    closeOnAction: true,
    closeOnMaskClick: true,
    actions: [
      [
        { key: "cancel", text: "取消" },
        { key: "ok", text: okText, bold: true, danger: Boolean(danger) },
      ],
    ],
    onAction: (action) => {
      if (action.key === "ok") onOk();
    },
  });
}
