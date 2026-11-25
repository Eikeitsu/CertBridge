# CertBridge CI


> Reqable 近期的更新将增强模式列入了VIP功能，所以开启抓包会显示未知应用，此问题与证书桥模块无关

- **安装写 conf 防 NUL**：`$MODPATH/config/certs.conf` 不再 `sed -i`（与 `user.conf` 同 awk→tmp→mv）；启动自愈含 NUL 的 conf
- **优化 [#39](https://github.com/Eikeitsu/CertBridge/issues/39)**：开机减 fork（`${var##*/}`、整目录 `cp -a`、日志少子 shell）；APEX 按 mount id 去重无版本 / `@版本` cacerts
- **修复 [#38](https://github.com/Eikeitsu/CertBridge/issues/38)**：AdGuard Personal → 系统自定义、Intermediate → 用户库；安装 / 同步 / 预设成对写入；手动导入与热挂载用户区 / `all` 均不把 Intermediate 提进系统库
- **体验 [#40](https://github.com/Eikeitsu/CertBridge/issues/40)**：运行正常时模块 `description` 字面 `\n` 双行（计数 + 证书名）；异常仍单行；`module.prop` 用 ENVIRON 写入，避免 awk 解成真换行
- **Reqable 证书新文件名**：兼容新版本Reqable证书 `reqable-ca.crt`（仍支持旧版证书 `reqable-root.crt`）
- **SukiSU Nova**：识别 `com.sukisu.nova`（兼容旧 `ultra`）；Root 探测与 WebUI「打开管理器」已跟上
- **安装导入更稳（Android 14+ / 17）**：Reqable / ProxyPin 补 `/data/data`、`user_ce`、无 `certificate/`、`app_flutter/` 与 Download；隔离 mount ns 下经 init / 目标进程 root 再探
- **隐藏登记跟进 ksud**：优先当场 `umount add`（可选 `save` / `umount-config`），SuSFS 仅可选；登记 flags 改 0（上游对 `MNT_DETACH` 会 -39）；CLI 风格本 boot 缓存；去掉已弃用 `add_sus_mount`
- **apex 挂载从 init 拆走**：boot_completed 后 zygote 侧改 private 再卸 init；`/proc/1/mountinfo` 不再留该 tmpfs；已跑 App 需强停。进程内是否卸掉仍看 umount / 排除名单
- **安装音量键**：打包保证 `volkey-*` 可执行，装机再 `chmod`，减少回退 `getevent` 弹出系统音量条
- **WebUI 减卡顿**：静默刷新默认不跑 `sync_apps`；App 标签按缺失包查询；优先 `bridge.toast`；Hide / Certs / Log / More 共用 `use*PageModel`
- **内部整理**：删未接入的 `AppShell` / 旧入口；隐藏探测去掉恒返别名；安装摘要 i18n；文档 / 隐藏页改中性表述
