import { Button, Space } from "antd";
import { BookOutlined, GithubOutlined, SmileOutlined } from "@ant-design/icons";
import {
  COOLAPK_URL,
  DOCS_URL,
  PROXYPIN_URL,
  REPO_URL,
  REQABLE_URL,
} from "@/shared/config/paths";
import { CertBrandIcon } from "@/features/certs/ui/CertBrandIcon";
import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { openUrl } from "@/shared/api/ksu";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { selectResolvedTheme } from "@/features/theme/model/selectors";

export function AboutSection() {
  const status = useAppSelector(selectModuleStatus);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const markSrc =
    resolvedTheme === "dark"
      ? `${import.meta.env.BASE_URL}img/icon-mark-light.png`
      : `${import.meta.env.BASE_URL}img/icon-mark.png`;
  const androidLabel = status.release
    ? `Android ${status.release}${status.api ? ` (API ${status.api})` : ""}`
    : EMPTY_PLACEHOLDER;

  return (
    <section className="cb-card">
      <div className="cb-section-title">关于</div>
      <div className="brand-about is-spaced">
        <img src={markSrc} alt="" />
        <div>
          <h3>证书桥</h3>
          <p>CertBridge · 许小墨</p>
        </div>
      </div>
      <p className="cb-muted is-meta">
        Reqable 从本机 App 导入；ProxyPin 优先 App，必要时使用模块内置兜底。也可导入自定义
        CA。
      </p>

      <Space direction="vertical" className="cb-full-width" size={10}>
        <div className="cb-kv-row">
          <span>版本</span>
          <span>{status.version || EMPTY_PLACEHOLDER}</span>
        </div>
        <div className="cb-kv-row">
          <span>系统</span>
          <span>{androidLabel}</span>
        </div>
        <Button block icon={<BookOutlined />} onClick={() => void openUrl(DOCS_URL)}>
          使用指南
        </Button>
        <Button block icon={<GithubOutlined />} onClick={() => void openUrl(REPO_URL)}>
          开源仓库
        </Button>
        <Button block icon={<SmileOutlined />} onClick={() => void openUrl(COOLAPK_URL)}>
          酷安主页
        </Button>
        <Button block onClick={() => void openUrl(REQABLE_URL)}>
          <span className="cb-brand-link">
            <CertBrandIcon kind="reqable" className="is-inline" />
            Reqable 官网
          </span>
        </Button>
        <Button block onClick={() => void openUrl(PROXYPIN_URL)}>
          <span className="cb-brand-link">
            <CertBrandIcon kind="proxypin" className="is-inline" />
            ProxyPin 仓库
          </span>
        </Button>
      </Space>

      <div className="cb-section-title is-spaced">打赏</div>
      <p className="cb-muted">
        许小墨 · 微信 / 支付宝。如果证书桥帮到了你，欢迎请作者喝杯奶茶。
      </p>
      <img
        className="tip-qr"
        src={`${import.meta.env.BASE_URL}assets/tip.png`}
        alt="打赏码"
      />
    </section>
  );
}
