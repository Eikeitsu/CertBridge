---
layout: home
hero:
  name: 证书桥
  text: 让系统信任抓包 CA
  tagline: Magisk / KernelSU / APatch · Reqable / ProxyPin / 自定义 · Android 7–16 · WebUI 与挂载隐藏
  image:
    src: /icon-mark-light.png
    alt: 证书桥
  actions:
    - theme: brand
      text: 了解功能
      link: /guide/features
    - theme: alt
      text: 安装模块
      link: /guide/install
features:
  - title: 系统信任库注入
    details: 每次开机合并系统 CA 与 addon，bind 到 system / APEX；失败则不挂载，保留原库。
  - title: 抓包 CA 导入
    details: Reqable / ProxyPin 从 App 同步；HttpCanary / ADGuard 可导入；支持 PEM / DER 自定义。
  - title: 挂载隐藏
    details: SuSFS / 内核 try_umount 协助；可选 Zygisk 过滤 mountinfo；WebUI「隐藏」页分方案说明。
  - title: WebUI · CLI · 热挂载
    details: 管理器内五页界面、cb 命令行、可选用户区 / 存储卡免重启临时挂载。
---

## 下载

正式包在 **GitHub Releases**（不要在 Issues / 文档正文里找 zip）：

**→ [https://github.com/Eikeitsu/CertBridge/releases](https://github.com/Eikeitsu/CertBridge/releases)**

| 文件                     | 说明                             |
| ------------------------ | -------------------------------- |
| `CertBridge_v*.zip`      | **推荐**：完整版（内置 OpenSSL） |
| `CertBridge_v*_lite.zip` | Lite（体积小，无 OpenSSL）       |

下载后见 [安装与升级](/guide/install)。管理器「检查更新」也会拉完整版。
