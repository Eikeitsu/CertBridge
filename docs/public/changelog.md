# 更新日志

## v1.0.1

- 项目更名为证书桥（CertBridge），模块显示名调整为「系统 CA 证书」
- 修复挂载目录只保留模块证书、导致系统原有 CA 暂时不可见的严重问题
- 改为现场增量合并系统 CA 与模块证书，不修改系统分区
- 修复 KernelSU / SukiSU Root 方案识别及模块状态长期显示“检测中”
- 优化深色模式文字与状态栏对比度，修复莫奈取色下无法切换深色模式
- 增加打赏码、酷安主页、WebUI 截图和更完整的使用文档
- 完善自动发版：同步 npm 版本、更新日志及 Pages 下载镜像

## v1.0.0

- 首次发布系统 CA 证书模块与 KernelSU WebUI
- 内置 Reqable / ProxyPin CA，支持独立开关与自定义证书
- 支持 Android 7–16；Android 14+ APEX Conscrypt 注入
- WebUI 提供概览、证书管理、日志和显示选项
