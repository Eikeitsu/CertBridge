# 安装与升级

## 环境要求

- **Magisk** v20.4+ / **KernelSU** / **APatch**
- Android 7.0+（API 24+）；Android 14+ 走 APEX 注入
- 建议使用支持 WebUI 的模块管理器

## 安装步骤

1. 从 [GitHub Releases](https://github.com/Eikeitsu/CACertStore/releases) 下载最新 zip
2. 在模块管理器中刷入
3. **重启**手机
4. 打开模块 WebUI，确认 Reqable / ProxyPin 已启用，APEX 状态正常

支持管理器在线更新：`module.prop` 的 `updateJson` 指向文档站上的 `update.json`。

## 模块目录（设备上）

```text
/data/adb/modules/CACertStore/
├── module.prop
├── post-fs-data.sh
├── service.sh
├── action.sh
├── bin/                 # common / apex 注入 / CLI
├── certs/
│   ├── builtin/         # Reqable、ProxyPin
│   └── custom/          # 用户自定义
├── config/certs.conf    # 开关配置
├── data/install.log     # 日志
├── system/etc/security/cacerts/  # 实际挂载内容
└── webroot/             # WebUI
```

## 卸载

在模块管理器中卸载即可。卸载脚本会尝试卸载 APEX 临时挂载。
