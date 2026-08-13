import { HelpCollapse } from "@/shared/ui";

export function CertsTips() {
  return (
    <HelpCollapse title="使用提示">
      <ul>
        <li>内置开关与自定义证书仍需重启后永久生效</li>
        <li>用户区 / 存储卡可建立临时会话并免重启卸载</li>
        <li>不保存系统 CA 基线；Android 14+ 自动覆盖 APEX 与 system</li>
        <li>设置 → 安全 → 可信凭据 可查看系统 CA</li>
        <li>用户证书模式会提升所有用户及工作资料中的 CA，请确认来源可信</li>
      </ul>
    </HelpCollapse>
  );
}
