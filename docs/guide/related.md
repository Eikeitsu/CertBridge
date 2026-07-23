# 相关软件

模块会自动检测已安装抓包 App 并导入其 CA：

- [Reqable](https://reqable.com) — 从 App 导入（不内置）
- [ProxyPin](https://github.com/wanghongenpin/proxypin) — 优先 App，未检测到时用模块内置证书
- HttpCanary / ADG 等 — 安装时若检测到，可询问导入为自定义证书

用户凭据区里的证书不等于系统信任库。若抓包断网，请确认 App 已生成当前根证，或用自定义导入 / 临时热挂载写入系统信任库，详见 [常见问题](/guide/faq)。若白名单为空能抓、只勾单个 App 却断网，多为抓包软件单应用 VPN / DNS 路径问题，同样见常见问题对应章节。

本模块由许小墨开发。
