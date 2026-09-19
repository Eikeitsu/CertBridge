# CertBridge CI


- **减轻晚注入 / KSU 误伤**：service 命名空间阶段默认不再二次 nsenter zygote/init（boot 已注入）；仅当 mountinfo 看不到本模块 bind 时才补注 zygote
- **隐藏探测更省**：`hide_allow=0` 时 status 不再执行 `ksud` / `ksu_susfs`；开启后按 boot 缓存探测结果，避免每次刷新拉起
- **强注抓包 App 开关**：`force_bind_capture`（默认关）。开启后命名空间注入会再次 bind Reqable/ProxyPin（旧行为），开着「卸载模块」也可能显示证书已安装；默认尊重卸载、不强注
