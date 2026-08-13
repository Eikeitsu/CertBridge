import { Card, Steps } from "antd-mobile";

export function SettingsWorkflow() {
  return (
    <Card title="推荐流程">
      <Steps direction="vertical" current={3}>
        <Steps.Step title="刷入模块并重启" />
        <Steps.Step title="打开 WebUI" description="确认 Reqable / ProxyPin 已启用" />
        <Steps.Step
          title="导入其它 CA"
          description="需要其它抓包工具时，导入对应 CA 或 hash.0"
        />
      </Steps>
      <p className="cb-muted" style={{ marginTop: 12 }}>
        配置：<code>config/certs.conf</code> · 日志：
        <code>data/install.log</code> · 自定义：
        <code>certs/custom/</code>
      </p>
    </Card>
  );
}
