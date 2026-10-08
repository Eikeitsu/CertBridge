<div align="center">

# 证书桥（CertBridge）

面向 Magisk / KernelSU / APatch 的 **系统 CA 注入**

把 Reqable、ProxyPin、自定义 PEM 合并进 Android 系统信任库——不改写系统分区。

[English](./README.md) · [文档](https://eikeitsu.github.io/CertBridge/) · [Releases](https://github.com/Eikeitsu/CertBridge/releases)

<br />

[![Release](https://img.shields.io/github/v/release/Eikeitsu/CertBridge?style=for-the-badge&label=Release)](https://github.com/Eikeitsu/CertBridge/releases)
[![Android](https://img.shields.io/badge/Android-7%E2%80%9316-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://eikeitsu.github.io/CertBridge/guide/install)
[![Root](https://img.shields.io/badge/Root-Magisk%20%7C%20KSU%20%7C%20APatch-orange?style=for-the-badge)](https://eikeitsu.github.io/CertBridge/)
[![License](https://img.shields.io/github/license/Eikeitsu/CertBridge?style=for-the-badge)](./LICENSE)

<br />

<img src="https://skillicons.dev/icons?i=react,typescript,vite,redux,sass,androidstudio,cpp,java,bash,nodejs,githubactions" alt="技术栈" />

</div>

## 功能

| 组件         | 说明                                                         |
| ------------ | ------------------------------------------------------------ |
| Magisk 模块  | `post-fs-data` / `service` 注入，可选晚注入                  |
| WebUI        | 首页 · 证书 · 日志 · 隐藏 · 更多                             |
| 免重启热挂载 | 用户区 / 存储卡证书临时注入，重启后消失                      |
| 挂载隐藏协助 | `ksud` 内核 umount / SuSFS / NoHello（默认会装、开关默认关） |
| Zygisk 过滤  | 在目标进程内过滤本模块挂载行（默认不安）                     |
| CLI          | `cb`：status / set / 证书相关                                |

界面语言默认跟随系统（`zh*` → 中文，其它 → 英语）。可在 **WebUI → 挂载与注入 → 语言** 修改。

## 工作原理

每次开机大致流程：

1. 从实时 system / Conscrypt APEX 信任库读取完整证书集（**不保存**系统基线）
2. 合并已启用的 addon（Reqable 从 App 读、ProxyPin、自定义 PEM 等）
3. 在完整兼容模式下，把整份证书集 **bind** 到信任库路径

复制或校验失败则跳过本次注入，系统原库不变。

## 快速开始

1. 从 [Releases](https://github.com/Eikeitsu/CertBridge/releases) 下载 `CertBridge_v*_arm64.zip`（多数真机）。其它架构用 `arm32` / `x86` / `x64`；只要体积可选 `*_lite.zip`（无 OpenSSL）。
2. 管理器刷入 → 约 20 秒内：**音量上**默认（推荐）/ **音量下**自定义 → **重启**。
3. 打开 WebUI，或执行 `cb status --live`。

在线更新（`updateJson`）始终跟踪 **arm64 完整版**。

📖 [安装](https://eikeitsu.github.io/CertBridge/guide/install) · [功能](https://eikeitsu.github.io/CertBridge/guide/features) · [FAQ](https://eikeitsu.github.io/CertBridge/guide/faq)

## 挂载模式

| 模式                 | 说明                                                          |
| -------------------- | ------------------------------------------------------------- |
| **完整兼容**（默认） | 运行时整库合并 + bind；不依赖 Magic Mount 元模块              |
| **轻量 Magic**       | 仅叠 addon 到 `system/`；Magisk 一般可用，KernelSU 需确认叠层 |

Android 14+：默认优先 bind 主 APEX、跳过 system（`experimental_14_system=skip`）。详见 [配置说明](https://eikeitsu.github.io/CertBridge/guide/config)。

## 技术栈

| 区域   | 技术                                                          |
| ------ | ------------------------------------------------------------- |
| WebUI  | React 18 · TypeScript · Vite · Redux Toolkit · Sass · i18next |
| 模块   | POSIX shell · Magisk 模块脚本                                 |
| 原生   | Zygisk C++（NDK）· 可选 `cbx509`（Java → dex）                |
| 文档   | VitePress                                                     |
| 工具链 | Node.js · ESLint · ShellCheck · Prettier · GitHub Actions     |

图标来自 [Skill Icons](https://skillicons.dev)；徽章来自 [Shields.io](https://shields.io)。

## 仓库结构

```text
module/       Magisk 模块
webui/        React WebUI
docs/         VitePress（中文根路径 + /en）
locales/      共享文案 JSON
scripts/      构建 / 发版 / i18n
tools/        cbx509 等
docs-dev/     维护者说明（BUILD / RELEASE）
changelog.md  手写更新日志（只写中文；发版自动机翻英文）
legacy/       旧版 WebUI 归档
```

构建与发版：[docs-dev/BUILD.md](./docs-dev/BUILD.md) · [docs-dev/RELEASE.md](./docs-dev/RELEASE.md)

## 链接

- **仓库**：[Eikeitsu/CertBridge](https://github.com/Eikeitsu/CertBridge)
- **文档**：[中文](https://eikeitsu.github.io/CertBridge/) · [English](https://eikeitsu.github.io/CertBridge/en/)
- **模块 ID**：`CertBridge`
