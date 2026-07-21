---
layout: home
hero:
  name: 证书桥
  text: CertBridge
  tagline: 将 Reqable、ProxyPin 与自定义 CA 安装到系统信任库。支持 Magisk / KernelSU WebUI，Android 14+ 自动 APEX 注入。
  actions:
    - theme: brand
      text: 了解功能
      link: /guide/features
    - theme: alt
      text: 安装模块
      link: /guide/install
features:
  - title: 内置证书
    details: 预置 Reqable 与 ProxyPin CA，可在 WebUI 中独立开关。
  - title: 自定义 CA
    details: 上传 PEM / DER 证书，自动校验 CA 属性、计算 hash 并处理文件名冲突。
  - title: Android 14+
    details: 针对 APEX Conscrypt 信任库自动注入，覆盖 zygote / 系统命名空间。
  - title: WebUI
    details: 状态概览、证书管理、日志；支持主题、莫奈取色、悬浮分页等显示选项。
---
