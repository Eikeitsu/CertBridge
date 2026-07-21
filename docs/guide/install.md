# 安装与升级

## 环境要求

- **Magisk** v20.4+ / **KernelSU** / **APatch**
- Android 7.0+（API 24+）；Android 14+ 走 APEX 注入
- 建议使用支持 WebUI 的模块管理器

## 安装步骤

1. 从 [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases) 下载最新 zip
2. 在模块管理器中刷入
3. **重启**手机
4. 打开模块 WebUI，确认 Reqable / ProxyPin 已启用，APEX 状态正常

支持管理器在线更新：`module.prop` 的 `updateJson` 指向文档站上的 `update.json`。

![概览](/screenshots/webui-overview.png)

## 模块目录（设备上）

```text
/data/adb/modules/CertBridge/
├── module.prop
├── post-fs-data.sh
├── service.sh
├── action.sh
├── bin/                 # common / apex 注入 / CLI
├── certs/
│   ├── builtin/         # Reqable、ProxyPin
│   ├── custom/          # 用户自定义
│   └── active/          # 当前启用的追加证书
├── config/certs.conf    # 开关配置
├── data/install.log     # 日志
└── webroot/             # WebUI
```

模块包不会创建 `system/etc/security/cacerts` 覆盖目录。系统 CA 与追加证书会在开机时合并到临时目录，验证完整后再挂载。

## 卸载

在模块管理器中卸载即可。卸载脚本会尝试卸载 APEX 临时挂载。
