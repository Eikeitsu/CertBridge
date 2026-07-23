# 相关软件

模块内置以下抓包软件的默认 CA，便于开箱试用：

- [Reqable](https://reqable.com) — 官网
- [ProxyPin](https://github.com/wanghongenpin/proxypin) — 软件主页

请注意：**Reqable** 本机根证书常会重生成，往往与模块内置样例不同；**ProxyPin** 根证通常固定，一般可直接用内置。用户凭据区里的证书也不等于系统信任库。若抓包断网，请从软件中导出**当前**证书，再用本模块写入系统信任库（自定义导入或临时热挂载），详见 [常见问题](/guide/faq)。

本模块由许小墨开发。
