# CertBridge CI


- **隐藏登记跟进上游 ksud**：`notify-module-mounted` → `kernel umount add`（主）/ 顶层 `umount add`（有则）→ 可选 `save`/`apply`/`umount-config`；去掉已弃用的 `add_sus_mount`；mountinfo 实况补登；按能力探测而非品牌分支
- **ksud umount CLI 风格缓存**：本 boot 一次探测 `kernel|top|none`，登记/清除/列表只走对应路径，减少重复 help grep 与双路试探
- **文档 / 隐藏页文案**：改为中性能力说明，去掉针对具体下游的对比表述
- **安装音量键**：zip 为 `volkey-*` 写入可执行位；`keys.sh` 装机时再 `chmod 0755`，避免无 +x 静默回退 `getevent` 弹出系统音量条
- **WebUI 减卡顿**：静默刷新默认不再跑 `sync_apps`；App 标签兜底改为按缺失包查询（不再全量 `dumpsys package`）；优先 `bridge.toast`
- **清理死代码**：删除未接入路由的 `AppShell` 与旧 feature 页入口；SuSFS 二进制解析改为「ksu 路径 + 模块 glob」；音量键 getevent 回退精简并优先 Magisk `chooseport`
- **隐藏探测**：去掉恒返 / 兼容别名（`hide_assist_available`、`hide_susfs4ksu_module_present` 等）
- **WebUI packs**：Hide/Certs/Log/More 共用 `use*PageModel`，去掉三套重复钩子
- **安装摘要 i18n**：`install_finish` 摘要走 `i18n_msg`（zh-CN/en）；orphan susfs4ksu 清理统一 helper
