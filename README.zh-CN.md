# 证书桥（CertBridge）

面向 Magisk / KernelSU / APatch 的 **系统 CA 注入**：把 Reqable / ProxyPin / 自定义证书合并进 Android 系统信任库，并提供挂载隐藏协助、可选 Zygisk 过滤与 WebUI。

- **显示名 / ID**：证书桥 · `CertBridge`
- **仓库**：[Eikeitsu/CertBridge](https://github.com/Eikeitsu/CertBridge)
- **文档**：[中文](https://eikeitsu.github.io/CertBridge/) · [English](https://eikeitsu.github.io/CertBridge/en/)
- **Releases**：[下载](https://github.com/Eikeitsu/CertBridge/releases)
- **English**：[README.md](./README.md)

## 快速开始

1. 从 Releases 下载 `*_arm64.zip`（或 arm32 / x86 / x64 / lite）
2. 刷入：音量上默认 / 音量下自定义 → 重启
3. 打开 WebUI 或执行 `cb status --live`

语言默认跟随系统（非中英 → 英语）。可在 WebUI「挂载与注入 → 语言」修改。

## 仓库结构

```text
module/      Magisk 模块
webui/       React WebUI
docs/        VitePress（中文根路径 + /en）
locales/     共享文案 JSON
scripts/     构建 / 发版 / i18n 生成
tools/       cbx509 等
docs-dev/    维护者构建说明
changelog/   zh-CN.md + en.md
legacy/      旧版 WebUI 归档
```

构建说明见 [docs-dev/BUILD.md](./docs-dev/BUILD.md)。
