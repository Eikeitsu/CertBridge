import { Segmented, Spin } from "antd";
import { AppearancePanel } from "@/features/theme/ui/AppearancePanel";
import { AboutSection } from "@/features/about/ui/AboutSection";
import { useMountMode } from "@/features/settings/hooks/useMountMode";
import { useTmpfsStyle } from "@/features/settings/hooks/useTmpfsStyle";
import type { MountMode, TmpfsStyle } from "@/entities/module/types";

export function SettingsPage() {
  const {
    mountMode,
    isPending: isMountPending,
    handleChange: handleMountChange,
  } = useMountMode();
  const {
    tmpfsStyle,
    isPending: isTmpfsPending,
    handleChange: handleTmpfsChange,
  } = useTmpfsStyle();

  return (
    <Spin spinning={isMountPending || isTmpfsPending}>
      <AppearancePanel />

      <section className="cb-card">
        <div className="cb-section-title">挂载模式</div>
        <Segmented
          block
          value={mountMode}
          onChange={(value) => void handleMountChange(value as MountMode)}
          options={[
            { label: "完整兼容", value: "compatible" },
            { label: "轻量 Magic", value: "magic" },
          ]}
        />
        <div className="cb-info is-spaced">
          <p>
            <strong>完整兼容（默认）</strong>
            <br />
            运行时整库合并后绑定，不写 system 叠层。不依赖 Magic Mount 元模块；Magisk /
            KernelSU / APatch 均可。
          </p>
          <p>
            <strong>轻量 Magic Mount</strong>
            <br />
            只把当前启用的附加证书叠进系统信任库；Android 14+ 仍对 APEX 做脚本注入。
          </p>
          <ul className="cb-tips">
            <li>
              <strong>Magisk</strong>：自带 Magic Mount，一般不需要元模块
            </li>
            <li>
              <strong>KernelSU</strong>
              ：需管理器正确叠层；若系统 CA
              只剩几张，请改回完整兼容，或确认挂载元模块提供正确 overlay
            </li>
            <li>
              <strong>APatch</strong>：视版本挂载实现而定，异常时用完整兼容
            </li>
          </ul>
          <p className="cb-muted">切换后需重启生效。</p>
        </div>
      </section>

      <section className="cb-card">
        <div className="cb-section-title">临时挂载路径</div>
        <Segmented
          block
          value={tmpfsStyle}
          onChange={(value) => void handleTmpfsChange(value as TmpfsStyle)}
          options={[
            { label: "短路径", value: "short" },
            { label: "传统路径", value: "legacy" },
          ]}
        />
        <div className="cb-info is-spaced">
          <p>
            <strong>短路径（默认）</strong>
            <br />
            使用 <code>/data/local/tmp/.fs0</code> / <code>.fs1</code>
            。mountinfo 里更不容易被按「证书合并」关键词扫到，收益有限但成本低。
          </p>
          <p>
            <strong>传统路径</strong>
            <br />
            使用 <code>/data/local/tmp/sys-ca-merge</code> / <code>sys-ca-merge-hot</code>
            。名称更直观，便于排障与对照旧版文档。
          </p>
          <p className="cb-muted">
            仅影响完整兼容模式与热挂载的临时层位置；切换后需重启。卸载时会同时清理两套路径。
          </p>
        </div>
      </section>

      <section className="cb-card">
        <div className="cb-section-title">推荐流程</div>
        <ol className="cb-tips is-ordered">
          <li>刷入模块并重启</li>
          <li>打开 WebUI 确认 Reqable / ProxyPin 已启用</li>
          <li>需要其它抓包工具时，导入对应 CA 或 hash.0</li>
        </ol>
        <p className="cb-muted is-meta">
          配置：<code>config/certs.conf</code> · 日志：
          <code>data/install.log</code> · 自定义：<code>certs/custom/</code>
        </p>
      </section>

      <AboutSection />
    </Spin>
  );
}
