import { Button } from "antd-mobile";
import { DeleteOutline, LoopOutline } from "antd-mobile-icons";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { PageRefresh, PageSpin, Panel } from "@/shared/ui";

export function LogPage() {
  const dispatch = useAppDispatch();
  const { text, loading, bytes, lines } = useAppSelector(selectActivityLog);

  const handleRefresh = async () => {
    const action = await dispatch(fetchActivityLog());
    if (fetchActivityLog.fulfilled.match(action)) {
      toast("日志已刷新");
    }
  };

  const handleClear = () => {
    confirmAction({
      title: "确认清空日志？",
      content: "仅清除本机日志文件，不影响证书配置。",
      okText: "清空",
      danger: true,
      onOk: () => dispatch(clearActivityLog()),
    });
  };

  return (
    <PageRefresh onRefresh={handleRefresh}>
      <Panel
        title="安装 / 注入日志"
        meta={`${lines ? `最近 ${lines} 行` : "暂无记录"}${
          bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""
        }`}
        action={
          <div className="cb-console__actions">
            <Button size="mini" fill="outline" onClick={() => void handleRefresh()}>
              <LoopOutline />
              刷新
            </Button>
            <Button size="mini" fill="outline" color="danger" onClick={handleClear}>
              <DeleteOutline />
              清空
            </Button>
          </div>
        }
      >
        <PageSpin spinning={loading}>
          <pre className="log-box">{text}</pre>
        </PageSpin>
      </Panel>
    </PageRefresh>
  );
}
