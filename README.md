# 证书桥（CertBridge）

将 **Reqable** / **ProxyPin** / 自定义 CA 安装到 Android 系统信任库的 Magisk 模块，支持 KernelSU WebUI。Android 14+ 自动 APEX Conscrypt 注入。

- **仓库**：[Eikeitsu/CertBridge](https://github.com/Eikeitsu/CertBridge)
- **文档**：[eikeitsu.github.io/CertBridge](https://eikeitsu.github.io/CertBridge/)
- **酷安**：[许小墨](https://www.coolapk.com/u/7602666)
- **模块显示名**：系统 CA 证书
- **模块 ID**：`CertBridge`

## WebUI 预览

| 概览 | 证书 |
|:---:|:---:|
| ![概览](docs/public/screenshots/webui-overview.png) | ![证书](docs/public/screenshots/webui-certs.png) |

| 日志 | 更多 |
|:---:|:---:|
| ![日志](docs/public/screenshots/webui-log.png) | ![更多](docs/public/screenshots/webui-more.png) |

## 功能概览

- 内置 Reqable / ProxyPin 证书，可独立开关
- 上传自定义 `xxxxxxxx.0` 证书
- Android 7–16；Android 14+ APEX bypass
- WebUI：状态、证书管理、日志；主题 / 莫奈 / 悬浮分页
- Magisk Action 一键同步并重新注入

## 快速开始

1. 从 [Releases](https://github.com/Eikeitsu/CertBridge/releases) 下载 zip
2. 刷入模块并重启
3. 打开 WebUI 确认证书状态

详细说明见 [在线文档](https://eikeitsu.github.io/CertBridge/) 或 `docs/`。

## 仓库结构

```text
module/          # Magisk 模块本体
  webroot/       # WebUI 源码
docs/            # VitePress 用户文档
  public/screenshots/  # WebUI 截图
tooling/         # 构建脚本
.github/         # CI 工作流
```

## 本地开发

```bash
npm install
npm run dev:web
npm run build:module
npm run dev:docs
```

构建说明见 [`tooling/BUILD.md`](tooling/BUILD.md)。

发版：Actions → **Release Module** → Run workflow，或推送 `v*` 标签。

## 相关软件

- [Reqable](https://reqable.com)
- [ProxyPin](https://github.com/wanghongenpin/proxypin)

## License

MIT
