# 功能介绍

## 做什么

证书桥（CertBridge）把指定 CA 证书**增量挂载**到 Android **系统信任库**。安装时保存完整系统 CA 基线，之后始终使用“系统基线 + 追加证书”生成挂载内容，不修改系统分区。

## WebUI 预览

| 概览 | 证书 |
|:---:|:---:|
| ![概览](/screenshots/webui-overview.png) | ![证书](/screenshots/webui-certs.png) |

| 日志 | 更多 |
|:---:|:---:|
| ![日志](/screenshots/webui-log.png) | ![更多](/screenshots/webui-more.png) |

## 主要能力

| 能力 | 说明 |
|------|------|
| Reqable CA | 内置 `833e2479.0`，可开关 |
| ProxyPin CA | 内置 `243f0bfb.0`，可开关 |
| 自定义证书 | 上传 / 删除 `xxxxxxxx.0` |
| 系统 CA 基线 | 安装时抓取并校验完整系统信任库，后续合并始终以此为准 |
| APEX 注入 | Android 14+（API 34+）自动挂载到 Conscrypt |
| 开机再注入 | `service.sh` 在开机完成后按需重新注入 |
| WebUI | KernelSU / 支持 WebUI 的管理器中配置 |
| Action | 管理器 Action 按钮：同步证书并 reinject |

## 适用场景

- Reqable / ProxyPin / Charles / mitmproxy 等需要系统 CA 的抓包
- Android 14 及以上系统 CA 放在 APEX 内、普通模块覆盖无效时

## 不做什么

- 不提供抓包代理本身（请使用 Reqable、ProxyPin 等 App）
- 不修改 SELinux 策略以外的系统安全机制
- 不会自动从用户凭据区「搬家」任意证书（请用 WebUI 上传或放入 `certs/custom/`）
