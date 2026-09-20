# 相关软件

证书桥只负责把 CA **写入系统信任库**，不提供抓包代理本身。下面列出会自动检测、询问导入，或常用手动导入的工具。

## 自动 / 安装时可导入

| 软件           | 链接                                                 | 与证书桥的关系                                                       |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| **Reqable**    | [reqable.com](https://reqable.com)                   | 从已安装 App 读取根证（**不内置**样例）；可开关；开机 / 刷新可再同步 |
| **ProxyPin**   | [GitHub](https://github.com/wanghongenpin/proxypin)  | 优先 App；未检测到且安装时启用了 ProxyPin → 模块内置兜底；可开关     |
| **HttpCanary** | [GitHub](https://github.com/MegatronKing/HttpCanary) | **仅安装时**可能询问是否导入为**自定义**证书                         |
| **ADGuard**    | [adguard.com](https://adguard.com)                   | **仅安装时**可能询问是否导入为**自定义**证书                         |

刷新 WebUI 时，若检测到 HttpCanary / ADGuard 现场 CA 且指纹未见，也可能提示导入为自定义。

## 需手动导入

Charles、mitmproxy、PCAPdroid、HttpCanary（未在安装时导入）等：

- WebUI「证书」页上传 PEM / DER
- 或将文件放入模块 `certs/custom/`，下次开机合并
- 部分常见路径支持一键导入预设（见证书页提示）

临时试用用户凭据区或存储卡里的 CA：用可选 [热挂载](/guide/config#热挂载)（重启后失效）。永久请用自定义导入。

## 抓包注意

- **用户证书**（凭据 / `cacerts-added`）≠ **系统证书**。很多 App 不会按系统 CA 同等信任用户区证书；本模块注入目标是 system / APEX 信任库。
- 对 Reqable / ProxyPin / 被抓包 App 开启「卸载模块」会导致「根证书未安装」或断网，见 [挂载隐藏](/guide/hide) 与 [常见问题](/guide/faq#root-cert-missing)。
- 白名单为空能抓、只勾单个 App 却断网，多为抓包软件单应用 VPN / DNS 问题，见 [FAQ](/guide/faq#whitelist-disconnect)。

确认 App 内指纹与模块里启用的证书一致后再抓包。
