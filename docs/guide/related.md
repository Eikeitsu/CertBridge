# 相关软件

模块会自动检测已安装抓包 App 并导入其 CA：

- [Reqable](https://reqable.com) — 从 App 导入（**不内置**样例证书）  
- [ProxyPin](https://github.com/wanghongenpin/proxypin) — 优先 App；未检测到且安装时启用了 ProxyPin 时用模块内置兜底  
- [HttpCanary](https://github.com/MegatronKing/HttpCanary) / [ADGuard](https://adguard.com) — **仅二者**在安装时可能询问是否导入为**自定义**证书  

Charles、mitmproxy 等请用 WebUI 自定义上传，或放入 `certs/custom/`。

用户凭据区里的证书不等于系统信任库。若抓包断网，请确认 App 已生成当前根证，或用自定义 / [热挂载](/guide/config#临时免重启挂载热挂载) 写入系统信任库，详见 [常见问题](/guide/faq)。白名单为空能抓、只勾单个 App 却断网，多为抓包软件单应用 VPN / DNS 问题，同样见常见问题。

本模块由许小墨开发。
