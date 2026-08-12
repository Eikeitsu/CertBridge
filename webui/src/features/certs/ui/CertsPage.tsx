import { Button, Drawer, Input, Space, Switch, Tag, Upload, Spin } from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
  selectModuleStatus,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import {
  useBuiltinCerts,
  resolveBuiltinSubtitle,
} from "@/features/certs/hooks/useBuiltinCerts";
import { useCertActions } from "@/features/certs/hooks/useCertActions";
import { useCertDetail } from "@/features/certs/hooks/useCertDetail";
import { useHotMountPanel } from "@/features/certs/hooks/useHotMountPanel";
import { CertBrandIcon } from "@/features/certs/ui/CertBrandIcon";
import { isFlagOn } from "@/shared/lib/flag";

const HOT_MODE_LABEL: Record<string, string> = {
  user: "用户证书",
  sd: "存储卡证书",
  all: "用户 + 存储卡",
};

export function CertsPage() {
  const status = useAppSelector(selectModuleStatus);
  const customCertificates = useAppSelector(selectCustomCertificates);
  const isStatusLoading = useAppSelector(selectStatusLoading);
  const builtinCerts = useBuiltinCerts();
  const {
    isPending,
    handleToggleBuiltin,
    handleImportFile,
    handleRemoveCustom,
    handleHotMount,
    handleHotUnmount,
  } = useCertActions();
  const { isOpen, title, fields, openDetail, closeDetail } = useCertDetail();
  const { mode, setMode, sdPath, setSdPath } = useHotMountPanel();

  const isHotSupported = isFlagOn(status.hot_supported);
  const isHotActive = isFlagOn(status.hot_active);
  const isHotPartial = isFlagOn(status.hot_partial);
  const isHotStale = isFlagOn(status.hot_stale);
  const hotSessionLabel = isHotActive
    ? `${isHotPartial ? "部分挂载" : "已挂载"}（${HOT_MODE_LABEL[status.hot_mode || ""] || "临时会话"}）`
    : isHotStale
      ? "状态异常（建议卸载或重启）"
      : "未挂载";

  return (
    <Spin spinning={isStatusLoading || isPending}>
      <section className="cb-card">
        <div className="cb-section-title">抓包应用证书</div>
        {builtinCerts.map((item) => (
          <div key={item.kind} className="cb-cert-row">
            <CertBrandIcon kind={item.kind} />
            <div className="cb-cert-row__body">
              <div className="cb-cert-row__title">{item.title}</div>
              <div className="cb-cert-row__sub">
                {resolveBuiltinSubtitle(item)}
              </div>
            </div>
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              disabled={!item.isAvailable}
              onClick={() => void openDetail(item.kind, item.title)}
            />
            <Switch
              checked={item.isEnabled}
              onChange={(checked) => void handleToggleBuiltin(item.kind, checked)}
            />
          </div>
        ))}
        <p className="cb-muted is-lead">
          点击详情可查看主题、颁发者与指纹。Reqable / ProxyPin 优先读本机
          App；ProxyPin 若未检测到则用模块内置兜底。永久变更需重启后生效。
        </p>
      </section>

      <section className="cb-card">
        <div className="cb-section-title is-toolbar">
          <span>自定义证书</span>
          <Upload
            accept=".pem,.crt,.cer,.der,.0"
            showUploadList={false}
            beforeUpload={(file) => {
              void handleImportFile(file);
              return false;
            }}
          >
            <Button size="small" icon={<CloudUploadOutlined />}>
              导入
            </Button>
          </Upload>
        </div>
        <p className="cb-muted is-meta">
          支持 PEM / DER / hash.0。会校验 X.509、有效期与 CA:TRUE。
        </p>
        {customCertificates.length === 0 ? (
          <p className="cb-muted">可导入 HttpCanary、ADGuard、Charles 等 CA。</p>
        ) : (
          customCertificates.map((cert) => (
            <div key={cert.name} className="cb-cert-row is-compact">
              <div className="cb-cert-row__body">
                <div className="cb-cert-row__title is-custom">{cert.display}</div>
                <div className="cb-cert-row__sub is-tiny">自定义</div>
              </div>
              <Button
                type="text"
                icon={<InfoCircleOutlined />}
                onClick={() =>
                  void openDetail(`custom:${cert.name}`, cert.display)
                }
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveCustom(cert.name)}
              />
            </div>
          ))
        )}
      </section>

      {isHotSupported && (
        <section className="cb-card">
          <div className="cb-section-title">临时免重启挂载</div>
          <p className="cb-info">
            将用户凭据区或存储卡目录中的有效 CA
            临时并入系统信任库，立即对当前应用生效。卸载后恢复此前证书层，不修改系统文件。
          </p>
          <p className="cb-muted is-warn">
            用户证书模式会把所有用户及工作资料中的 CA
            临时提升为全局系统信任，请确认来源可信。
          </p>

          {isHotActive ? (
            <>
              <div className="cb-kv-list">
                <div className="cb-kv-row">
                  <span>临时会话</span>
                  <span>{hotSessionLabel}</span>
                </div>
                <div className="cb-kv-row">
                  <span>已加入证书</span>
                  <span>{status.hot_added || "0"}</span>
                </div>
                <div className="cb-kv-row">
                  <span>活动命名空间</span>
                  <span>{status.hot_namespaces || "0"}</span>
                </div>
              </div>
              <Space wrap className="cb-stack-top">
                {isHotPartial && <Tag color="gold">部分会话未覆盖</Tag>}
                <Button danger onClick={() => handleHotUnmount()}>
                  无痕卸载
                </Button>
              </Space>
              <p className="cb-muted is-warn">
                {isHotPartial
                  ? `${status.hot_failed || "0"} 个普通命名空间未覆盖，或关键命名空间已变化；可卸载后重试。`
                  : "临时挂载在重启后自动失效；操作期间请勿同时运行其它证书挂载脚本。"}
              </p>
            </>
          ) : (
            <Space direction="vertical" className="cb-full-width" size={12}>
              <label className="cb-path-field">
                <span className="cb-field-label">存储卡证书目录</span>
                <Input
                  value={sdPath}
                  onChange={(event) => setSdPath(event.target.value)}
                    placeholder="/sdcard/Documents/cacerts"
                  allowClear
                />
                <span className="cb-muted is-tiny">
                  支持 PEM / DER / CRT / CER / hash.0，递归扫描，最多 128 张
                </span>
              </label>
              <div className="cb-hot-actions">
                <Button
                  type={mode === "user" ? "primary" : "default"}
                  onClick={() => {
                    setMode("user");
                    handleHotMount("user");
                  }}
                >
                  挂载用户证书
                </Button>
                <Button
                  type={mode === "sd" ? "primary" : "default"}
                  onClick={() => {
                    setMode("sd");
                    handleHotMount("sd", sdPath);
                  }}
                >
                  挂载存储卡证书
                </Button>
                <Button
                  type={mode === "all" ? "primary" : "default"}
                  onClick={() => {
                    setMode("all");
                    handleHotMount("all", sdPath);
                  }}
                >
                  合并挂载
                </Button>
              </div>
              <div className="cb-kv-list">
                <div className="cb-kv-row">
                  <span>临时会话</span>
                  <span>{hotSessionLabel}</span>
                </div>
              </div>
              <p className="cb-muted">
                临时挂载在重启后自动失效；操作期间请勿同时运行其它证书挂载脚本。
              </p>
            </Space>
          )}
        </section>
      )}

      <section className="cb-card">
        <div className="cb-section-title">使用提示</div>
        <ul className="cb-tips">
          <li>内置开关和自定义证书永久配置仍在重启后生效</li>
          <li>用户区 / 存储卡证书可建立临时会话并免重启卸载</li>
          <li>不保存系统 CA 基线；Android 14+ 自动覆盖 APEX 与 system 双路径</li>
          <li>设置 → 安全 → 可信凭据 可查看系统 CA</li>
        </ul>
      </section>

      <Drawer
        title={title || "证书详情"}
        open={isOpen}
        onClose={closeDetail}
        width="100%"
      >
        <Space direction="vertical" className="cb-full-width" size={10}>
          {Object.keys(fields).length === 0 && (
            <span className="cb-muted">暂无详情</span>
          )}
          {Object.entries(fields).map(([key, value]) => (
            <div key={key}>
              <div className="cb-detail-key">{key}</div>
              <div className="cb-detail-value">{value}</div>
            </div>
          ))}
        </Space>
      </Drawer>
    </Spin>
  );
}
