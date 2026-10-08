# CertBridge CI


- **双日志**：拆分 `install.log`（仅新安装清空）与 `runtime.log`（每次 post-fs 清空）；WebUI 合并展示，清空按钮只清 runtime
- **隐藏登记**：同一路径不再 bind 后与 after_inject 各登一次；ksud/SuSFS 失败记下 stderr；「已存在」视为成功
- **卸载路径登记**：BakaSU 同步写入 `ksud umount-config`（开机可重载、管理器标持久）；不再创建 `susfs4ksu` 配置目录，若未安装该模块则清理误留的 `/data/adb/susfs4ksu`；已登记路径改读 ksud 列表（不依赖误建的 susfs4ksu 目录）
- **卸载清理**：`uninstall.sh` 补清 ksud umount / umount-config、SuSFS try_umount.txt、NoHello 托管块；仍需重启才能去掉 cacerts 脚本 bind / Magic Mount
- **隐藏页切 Tab**：完整 status 改后台落盘轮询，离开隐藏页即 abort，避免堵 WebUI 桥
- **隐藏页探测体验**：探测中显示「正在探测…」而非「无助手」；本 boot 缓存 hide status；登记路径写入模块状态并展示
