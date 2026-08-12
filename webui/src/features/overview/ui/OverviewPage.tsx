import { Button, Modal, Spin, Tag } from "antd";
import {
  ReloadOutlined,
  PoweroffOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/app/store/hooks";
import { refreshStatus, requestReboot } from "@/features/status/model/statusSlice";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";

export function OverviewPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    trust,
    isLoading,
    activeCount,
    customCount,
    isPendingReboot,
    isHotMountActive,
    isHotMountSupported,
    rootLabel,
    apexLabel,
    mountModeLabel,
    androidLabel,
    versionLabel,
    hotStatusLabel,
    lastRefreshedAt,
    activeNames,
    baselineCount,
    storeCount,
    description,
    injectDiagnosis,
  } = useTrustOverview();

  const handleReboot = () => {
    Modal.confirm({
      title: "确认重启设备？",
      content: "应用挂载变更建议重启。",
      okText: "重启",
      cancelText: "取消",
      onOk: () => dispatch(requestReboot()),
    });
  };

  const statusText = injectDiagnosis?.message
    ? injectDiagnosis.message
    : description || trust.hint;

  return (
    <Spin spinning={isLoading}>
      <section className={`cb-card cb-hero tone-${trust.tone}`}>
        <div className="cb-hero__head">
          <div className="cb-hero__main">
            <p className="eyebrow">运行状态</p>
            <h2>{trust.title}</h2>
            {injectDiagnosis?.hint ? (
              <p className="cb-desc">{injectDiagnosis.hint}</p>
            ) : (
              <p className="hint">{statusText}</p>
            )}
          </div>
          <span className={`cb-status-badge is-${trust.tone}`}>{trust.title}</span>
        </div>

        {injectDiagnosis?.message ? (
          <div className="cb-diag">
            <p className="cb-diag__msg">{injectDiagnosis.message}</p>
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/log", { replace: true })}
            >
              查看日志
            </Button>
          </div>
        ) : null}

        <div className="cb-hero__actions">
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => void dispatch(refreshStatus(true))}
          >
            刷新状态
          </Button>
        </div>
      </section>

      <div className="cb-grid is-quad">
        <div className="cb-stat">
          <div className="label">启用证书</div>
          <div className="value">{activeCount}</div>
        </div>
        <div className="cb-stat">
          <div className="label">自定义</div>
          <div className="value">{customCount}</div>
        </div>
        <div className="cb-stat">
          <div className="label">系统基线</div>
          <div className="value">{baselineCount}</div>
        </div>
        <div className="cb-stat">
          <div className="label">合并总量</div>
          <div className="value">{storeCount}</div>
        </div>
      </div>

      <section className="cb-card is-spaced">
        <div className="cb-section-title">运行详情</div>
        <div className="cb-mini-grid">
          <div className="cb-mini-item">
            <div className="value">{androidLabel}</div>
            <div className="label">Android</div>
          </div>
          <div className="cb-mini-item">
            <div className="value">{rootLabel}</div>
            <div className="label">Root</div>
          </div>
          <div className="cb-mini-item">
            <div className="value">{apexLabel}</div>
            <div className="label">APEX</div>
          </div>
          <div className="cb-mini-item">
            <div className="value">{mountModeLabel}</div>
            <div className="label">挂载</div>
          </div>
          <div className="cb-mini-item">
            <div className="value">{versionLabel}</div>
            <div className="label">版本</div>
          </div>
          <div className="cb-mini-item">
            <div className="value">{hotStatusLabel}</div>
            <div className="label">热挂载</div>
          </div>
        </div>
        <div className="cb-kv-list">
          <div className="cb-kv-row">
            <span>最近刷新</span>
            <span>{lastRefreshedAt}</span>
          </div>
        </div>
        <div className="cb-trust-list">
          {isPendingReboot && <Tag color="gold">待重启生效</Tag>}
          {isHotMountActive && <Tag color="cyan">临时证书已挂载</Tag>}
        </div>
      </section>

      <section className="cb-card">
        <div className="cb-section-title">当前信任名单</div>
        {activeNames.length ? (
          <div className="cb-trust-list">
            {activeNames.map((certName) => (
              <span key={certName} className="cb-trust-chip">
                {certName}
              </span>
            ))}
          </div>
        ) : (
          <p className="cb-muted">暂无附加证书。可在「证书」页启用或导入。</p>
        )}
      </section>

      <section className="cb-card">
        <div className="cb-section-title">快捷操作</div>
        <div className="cb-action-panel">
          <div className="cb-action-primary">
            <div>
              <div className="cb-action-primary__title">重启设备</div>
              <p className="cb-muted">应用挂载变更建议重启</p>
            </div>
            <Button danger icon={<PoweroffOutlined />} onClick={handleReboot}>
              重启
            </Button>
          </div>
          <div className="cb-action-row">
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => navigate("/certs", { replace: true })}
            >
              管理证书
            </Button>
            {isHotMountSupported && (
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => navigate("/certs", { replace: true })}
              >
                临时证书
              </Button>
            )}
          </div>
        </div>
      </section>
    </Spin>
  );
}
