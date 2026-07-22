# 更新日志

## v1.1.2

- 模块脚本按功能拆分到 `bin/lib/`（log / keys / conf / lock / store / certs / openssl / verify / generation / status），`common.sh` 仅作加载入口
- Action 增加实用功能：音量上刷新状态，音量下进入菜单，可免重启挂载/卸载用户区与存储卡临时 CA

## v1.1.1

- 修复 Android 14+ 仅注入 APEX、未覆盖 system 路径导致 Reqable 等检测「证书未安装」的问题；现同时运行时绑定 APEX 与 system
- 开机后命名空间注入扩展到抓包 App 与已运行应用，避免 Settings 能看到证书但抓包 TLS 仍失败 / 断网
- 临时热挂载会合并已启用的永久 addon，且同样覆盖 APEX / system 双路径
- 重做普通深色配色与卡片层次；莫奈深色改为跟随系统色相 / MD3 token，不再与固定深色共用一套写死色值
- 移除深色顶栏浅色状态栏条，改为依赖 `color-scheme` 与 theme-color 同步状态栏

## v1.1.0

- 移除持久化系统 CA 基线与 `system/cacerts` 覆盖目录，改为每次开机从当前 system / Conscrypt APEX 信任库生成完整证书集
- 生成阶段校验证书数量、复制结果、附加证书校验和及 SELinux 上下文；任一步失败都保留系统原始信任库
- Android 7–13 注入 system，Android 14+ 注入 Conscrypt APEX；挂载增加所有权校验、只读重挂载、失败回滚和关键命名空间复核
- 永久证书配置改为重启后生效；自定义 CA 支持 PEM / DER、有效期与 `CA:TRUE` 校验，并自动处理 subject hash 冲突
- 新增可选的用户凭据区与存储卡证书免重启挂载，临时会话按来源和挂载身份安全卸载，不修改系统文件
- 安装脚本支持音量键选择默认或自定义方案，可分别启用 Reqable、ProxyPin、WebUI 和免重启热挂载
- WebUI、CLI 与 Action 增加待重启、注入失败及临时会话状态；未安装可选组件时自动隐藏或降级对应功能
- 加强写锁、目录权限、日志轮转、Root 环境识别与发布包完整性检查

## v1.0.2

- 紧急修复 KernelSU Magic Mount 将系统 CA 目录遮蔽为仅剩 Reqable、ProxyPin 两张证书的问题
- 紧急修复运行时证书合并失败后系统信任库为空、导致 TLS 连接及抓包断网的问题
- 恢复系统 CA 基线方案，始终以“完整系统基线 + 模块证书”生成挂载内容
- 安装时至少捕获 10 张系统 CA 才允许继续，基线缺失时中止安装
- Android 14+ APEX 与传统 system 路径分别从系统基线生成 tmpfs
- 增加 PID 1、Zygote 与系统设置进程的注入日志

## v1.0.1

- 项目更名为证书桥（CertBridge），模块显示名调整为「系统 CA 证书」
- 移除持久化系统 CA 基线抓取，改为每次注入时现场读取并增量合并系统信任库
- 模块目录仅保存需要追加的证书，重启后挂载自动消失，不修改系统分区
- 保留证书数量安全检查，系统信任库异常时拒绝执行覆盖挂载
- 优化深色模式文字与状态栏对比度，修复莫奈取色下无法切换深色模式
- 增加打赏码、酷安主页和四张 WebUI 预览截图
- WebUI「关于」页面新增在线使用文档入口
- 项目文档、安装路径、构建产物及更新地址同步适配 CertBridge
- 发版时自动同步 `package.json`、`package-lock.json` 与模块版本号
- 更新日志支持手写优先、缺失时自动生成，并可直接在文档站查看
- 更新日志与模块 ZIP 同步部署到 GitHub Pages，改善更新检查与下载体验

## v1.0.0

- 首次发布系统 CA 证书模块与 KernelSU WebUI
- 内置 Reqable / ProxyPin CA，支持独立开关与自定义证书
- 支持 Android 7–16；Android 14+ APEX Conscrypt 注入
- WebUI 提供概览、证书管理、日志和显示选项
