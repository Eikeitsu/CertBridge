import { NxCard, NxCollapse, NxSection } from "@/shared/ui";

export function CertsTips() {
  return (
    <NxSection eyebrow="Tips" title="使用提示">
      <NxCard>
        <NxCollapse title="永久 vs 临时">
          <p>永久证书写入模块配置，重启后注入系统信任库。</p>
          <p>临时挂载只建立当前会话，重启后自动失效，适合快速验证。</p>
        </NxCollapse>
        <NxCollapse title="找不到证书？">
          <p>先在 Reqable / ProxyPin 生成根证书，再回到本页开启对应开关。</p>
          <p>也可直接导入其它抓包工具导出的 CA 文件。</p>
        </NxCollapse>
      </NxCard>
    </NxSection>
  );
}
