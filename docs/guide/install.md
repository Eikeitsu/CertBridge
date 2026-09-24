# 安装与升级

::: tip 下载模块
正式包只在 GitHub Releases，点这里打开：

**[https://github.com/Eikeitsu/CertBridge/releases](https://github.com/Eikeitsu/CertBridge/releases)**

真机下 `CertBridge_v*_arm64.zip`（推荐）或 `*_arm32.zip`；模拟器用 `*_x64.zip` / `*_x86.zip`；体积敏感再选 `*_lite.zip`。不要在 Issues、讨论区或文档站目录里找 zip。
:::

## 环境要求

- 已安装 **Magisk**、**KernelSU**（含 SukiSU 等）、**APatch** 或兼容方案
- Android 7.0+（API 24+）；Android 14+ 走 APEX 注入
- 使用 WebUI 需支持模块网页的管理器（KernelSU / SukiSU / APatch 系 / MMRL / WebUI-X 等）

## 该下哪个？先看这三句

1. **多数人（arm64 手机）**：下 `CertBridge_v*_arm64.zip`（完整版，仅含本架构 OpenSSL）。管理器「检查更新」也是拉这个。
2. **其它架构**：下 `*_arm32.zip` / `*_x86.zip` / `*_x64.zip`。
3. **只要体积小**：下 `CertBridge_v*_lite.zip`（约 8KB `cbx509` dex，无 OpenSSL）。模块 id 相同（`CertBridge`），不要同时装；覆盖刷入即可切换。

## Release 文件一览

每个正式版在 [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases) 大致包含：

| 文件名                    | 内容                                      | 适合谁                                 |
| ------------------------- | ----------------------------------------- | -------------------------------------- |
| `CertBridge_v*_arm64.zip` | 完整版：仅 arm64 OpenSSL（+ 对应 Zygisk） | **推荐默认**；多数真机                 |
| `CertBridge_v*_arm32.zip` | 完整版：仅 arm32 OpenSSL（armeabi-v7a）   | 32 位 ARM 设备                         |
| `CertBridge_v*_x86.zip`   | 完整版：仅 x86 OpenSSL                    | x86 模拟器                             |
| `CertBridge_v*_x64.zip`   | 完整版：仅 x64 OpenSSL（Android x86_64）  | x86_64 模拟器                          |
| `CertBridge_v*_lite.zip`  | Lite：`cbx509` dex，无 OpenSSL            | 体积敏感；Recovery 导入 App 证可能受限 |

说明：

- 在线更新（`updateJson`）始终指向 **arm64 完整版**。
- Lite 可在重启后用 WebUI / 自定义目录补证书。
- 发布包可含对应 ABI 的 `zygisk/*.so`；未构建 so 时自定义勾选会提示缺组件。
- 本地若需旧式「单包多架构」：`PACKAGE_FAT=1 npm run package:module`。

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

升级会尽量保留 `certs.conf`、自定义证书、旧 `certs/sources` / `data/state` 快照，并迁到 `/data/adb/certbridge/`；组件是否安装以本次刷入选择为准。

## 热更新说明

支持免重启热更新（管理器 / WebUI 安装模块时）。外部目录 `/data/adb/certbridge/` 存放热更新临时文件、开关（`user.conf`）与证书工作副本 / 关断快照；失败会回退到需重启的标准更新。热更新后 **WebUI / CLI 脚本立即生效**。

## 设备上目录（摘要）

```text
/data/adb/certbridge/            # 模块外
├── user.conf / addon-sources / …
└── cb                           # CLI 入口（推荐）

/data/adb/modules/CertBridge/
├── module.prop / post-fs-data.sh / service.sh / action.sh
├── bin/                 # common、注入、cert_manager、可选 hot / hide / openssl 或 cbx509
├── certs/
│   ├── builtin/         # 仅 ProxyPin 兜底
│   ├── sources/         # 旧路径（兼容，启动时迁到 /data/adb/certbridge）
│   ├── custom/          # 用户自定义
│   ├── generation/      # 本次启动生成的完整证书集
│   └── hot/             # 临时会话（卸载后删除）
├── config/certs.conf
├── config/zn_whitelist.txt   # Zygisk 白名单（有组件时）
├── zygisk/              # 可选 *.so
├── data/state/          # applied 列表、运行时状态等
└── webroot/             # 可选 WebUI
```

## 卸载

在模块管理器卸载后**必须重启**。卸载脚本会尝试结束当前热挂载会话；**不会**强拆开机永久 CA 挂载（以免误伤其它证书模块叠层），由重启统一清理。
