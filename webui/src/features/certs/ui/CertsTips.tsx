import { HelpCollapse } from "@/shared/ui";

export function CertsTips() {
  return (
    <HelpCollapse title="使用提示">
      <ul>
        <li>临时挂载默认关闭自动行为：放入证书目录不会自动挂载，需在本页手动「开始临时挂载」</li>
        <li>可通过「允许临时挂载」开关禁用该功能；关闭时会卸载当前临时会话</li>
        <li>内置开关与自定义证书仍需重启后永久生效</li>
        <li>临时挂载成功后，同页会出现「无痕卸载」按钮；也可直接重启清除临时层</li>
        <li>不保存系统 CA 基线；Android 14+ 自动覆盖 APEX 与 system</li>
        <li>设置 → 安全 → 可信凭据 可查看系统 CA</li>
        <li>用户证书模式会提升所有用户及工作资料中的 CA，请确认来源可信</li>
      </ul>
    </HelpCollapse>
  );
}
