# 安装与升级

::: tip 下载模块
正式包只在 GitHub Releases，点这里打开：

**[https://github.com/Eikeitsu/CertBridge/releases](https://github.com/Eikeitsu/CertBridge/releases)**

多数人下载 `CertBridge_v*.zip`（完整版）；体积敏感再选 `*_lite.zip`。不要在 Issues、讨论区或文档站目录里找 zip。
:::

## 环境要求

- 已安装 **Magisk**、**KernelSU**（含 SukiSU 等）、**APatch** 或兼容方案
- Android 7.0+（API 24+）；Android 14+ 走 APEX 注入
- 使用 WebUI 需支持模块网页的管理器（KernelSU / SukiSU / APatch 系 / MMRL / WebUI-X 等）

## 该下哪个？先看这三句

1. **多数人**：下 `CertBridge_v<版本>.zip`（**完整版**，内置 OpenSSL）刷入即可。管理器「检查更新」也是拉这个。
2. **只要体积小**：下 `CertBridge_v*_lite.zip`（约 8KB `cbx509` dex，无 OpenSSL）。
3. **二者模块 id 相同**（`CertBridge`），不要同时装；覆盖刷入即可切换。

## Release 文件一览

每个正式版在 [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases) 大致包含：

| 文件名                   | 内容                                                            | 适合谁                                            |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------- |
| `CertBridge_v*.zip`      | 完整版：静态 OpenSSL（默认 arm + arm64，安装后按 ABI 只留一份） | **推荐默认**；Recovery 刷入更稳                   |
| `CertBridge_v*_lite.zip` | Lite：`cbx509` dex，依赖本机 `app_process` / `dalvikvm`         | 体积敏感；纯 Recovery 安装阶段可能解析不了 App 证 |

说明：

- 在线更新（`updateJson`）始终指向**完整版**。
- Lite 可在重启后用 WebUI / 自定义目录补证书。
- 发布包可含 `zygisk/*.so`（Zygisk 过滤）；未构建 so 时自定义勾选会提示缺组件。

## 安装步骤

1. 从 [Releases](https://github.com/Eikeitsu/CertBridge/releases) 选一个 zip
2. 在模块管理器中刷入
3. **20 秒内**用音量键选择安装方式（见下表）
4. **重启**
5. 打开 WebUI 或看模块简介确认状态

### 默认安装（音量上 / 超时）

| 项目               | 行为                                                      |
| ------------------ | --------------------------------------------------------- |
| Reqable / ProxyPin | 自动检测 App CA；ProxyPin 无 App 证时用内置兜底           |
| WebUI              | 安装                                                      |
| 热挂载             | 安装                                                      |
| 挂载隐藏协助       | **安装**，`hide_allow` **默认关闭**（可在「隐藏」页开启） |
| Zygisk 过滤        | **不安装**                                                |
| 挂载模式           | 固定 **完整兼容**                                         |

### 自定义安装（音量下）

依次询问：Reqable、ProxyPin、WebUI、热挂载、挂载隐藏协助、**Zygisk 挂载痕迹过滤**、挂载模式（完整兼容 / 轻量 Magic）。

| 组件         | 勾选后默认开关                       |
| ------------ | ------------------------------------ |
| 挂载隐藏协助 | `hide_allow=1`（可在 WebUI 关）      |
| Zygisk 过滤  | `zn_hide_allow=1`（需已启用 Zygisk） |

若检测到 **HttpCanary**、**ADGuard**，会再询问是否导入为自定义证书。

无人值守：存在 `/data/adb/certbridge/install_auto` 时跳过音量键，走默认安装（用后删除）。

### Action 按钮

- **音量上**（或超时）：刷新 / 同步状态
- **音量下**：已装热挂载时可挂载或卸载临时 CA

## 在线更新

`module.prop` 的 `updateJson` 指向文档站正式通道。WebUI「更多」可切换 **正式 / CI** 通道（CI 来自 `ci-dist` 分支，便于尝鲜）。

升级会尽量保留 `certs.conf`、自定义证书与安装档案；组件是否安装以本次刷入选择为准。

## 热更新说明

支持免重启热更新（管理器 / WebUI 安装模块时）。外部短时文件在 `/data/adb/certbridge/`；失败会回退到需重启的标准更新。

## 设备上目录（摘要）

```text
/data/adb/modules/CertBridge/
├── module.prop / post-fs-data.sh / service.sh / action.sh
├── bin/                 # common、注入、cb、可选 hot / hide / openssl 或 cbx509
├── certs/
│   ├── builtin/         # 仅 ProxyPin 兜底
│   ├── sources/         # 从 App 导入的 Reqable / ProxyPin
│   ├── custom/          # 用户自定义
│   ├── generation/      # 本次启动生成的完整证书集
│   └── hot/             # 临时会话（卸载后删除）
├── config/certs.conf
├── config/zn_whitelist.txt   # Zygisk 白名单（有组件时）
├── zygisk/              # 可选 *.so
├── data/
└── webroot/             # 可选 WebUI
```

## 卸载

在模块管理器卸载后**必须重启**。卸载脚本会尝试结束当前热挂载会话；**不会**强拆开机永久 CA 挂载（以免误伤其它证书模块叠层），由重启统一清理。
