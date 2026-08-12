import { Button, Modal, Space, Spin } from "antd";
import { ClearOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  clearActivityLog,
  fetchActivityLog,
} from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";

export function LogPage() {
  const dispatch = useAppDispatch();
  const { text, loading, bytes, lines } = useAppSelector(selectActivityLog);

  const handleRefresh = () => {
    void dispatch(fetchActivityLog()).then((action) => {
      if (fetchActivityLog.fulfilled.match(action)) {
        toast("日志已刷新");
      }
    });
  };

  const handleClear = () => {
    Modal.confirm({
      title: "确认清空日志？",
      content: "仅清除本机日志文件，不影响证书配置。",
      okText: "清空",
      cancelText: "取消",
      onOk: () => dispatch(clearActivityLog()),
    });
  };

  return (
    <section className="cb-card">
      <div className="cb-section-title is-toolbar">
        <span>安装 / 注入日志</span>
        <Space size={8}>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
          <Button
            size="small"
            danger
            icon={<ClearOutlined />}
            onClick={handleClear}
          >
            清空
          </Button>
        </Space>
      </div>
      <p className="cb-muted is-meta">
        {lines ? `最近 ${lines} 行` : "暂无记录"}
        {bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""}
      </p>
      <Spin spinning={loading}>
        <pre className="log-box">{text}</pre>
      </Spin>
    </section>
  );
}
