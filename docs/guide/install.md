# 安装与升级

## 环境要求

- **Magisk** v20.4+ / **KernelSU** / **APatch**
- Android 7.0+（API 24+）；Android 14+ 走 APEX 注入
- 建议使用支持 WebUI 的模块管理器

## 安装步骤

1. 从 [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases) 下载最新 zip
2. 在模块管理器中刷入
3. 在 20 秒内使用音量键选择安装方式：
   - **音量上：默认安装（推荐）**——自动检测 Reqable / ProxyPin 等 App 证书，ProxyPin 无 App 证时用内置兜底，并安装 WebUI 与免重启热挂载
   - **音量下：自定义安装**——依次选择 Reqable、ProxyPin、WebUI 和免重启热挂载
   - 若检测到 HttpCanary、ADG 等，会再依次询问是否导入为自定义证书
   - 未检测到按键或选择超时，使用默认完整安装
4. **重启**手机
5. 若选择安装 WebUI，可打开页面确认证书状态与详情

自定义安装中的每个组件均需明确按音量上安装；音量下或 20 秒超时会按安全默认跳过当前组件。未启用的证书开关不会加入系统信任库，之后仍可通过 `config/certs.conf` 或 WebUI 开关启用（Reqable 需已有 App 导入源）。

支持管理器在线更新：`module.prop` 的 `updateJson` 指向文档站上的 `update.json`。

![概览](/screenshots/webui-overview.png)

## 模块目录（设备上）

```text
/data/adb/modules/CertBridge/
├── module.prop
├── post-fs-data.sh
├── service.sh
├── action.sh
├── bin/                 # common / APEX 注入 / CLI；hot_mount.sh 为可选组件
├── certs/
│   ├── builtin/         # 仅 ProxyPin 兜底
│   ├── sources/         # 从 App 导入的 Reqable / ProxyPin
│   ├── custom/          # 用户自定义
│   ├── generation/      # 本次启动从实时系统信任库生成的完整证书集
│   └── hot/             # 可选免重启临时会话（卸载后删除）
├── config/certs.conf    # 开关配置
├── config/install-profile.conf # 本次安装方式与可选组件记录
├── data/install.log     # 日志
└── webroot/             # 可选 WebUI
```

模块不在安装时抓取或长期保存系统 CA，也不创建会触发 Magic Mount 的 `system/cacerts` 目录。重启时才读取实时系统信任库；至少读取到 10 张证书且完整合并、校验成功后才挂载。任一步失败都会保留系统原始信任库。

## 卸载

在模块管理器中卸载后必须重启。卸载脚本不会主动拆除系统 CA 挂载，以免误卸载其它证书模块或只清理部分叠加层；重启会由内核统一清理。
