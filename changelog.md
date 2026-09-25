# CertBridge CI


- **Zygisk 挂载过滤**：过滤 mountinfo/mounts、maps/smaps；弱化 map_files readlink，默认不需要，按需安装
- **Zygisk smaps 过滤修复**：按 VMA 整段丢弃（首行+Size/Rss 字段），避免检测 App 解析残缺 smaps 闪退；hooks 内吞掉 C++ 异常
- **Zygisk 匿名可执行映射**：maps/smaps 隐藏 `[anonymous]` / 无名可执行页（PLT 跳板痕迹），保留 `[anon:…]` 等 ART 标签
- **SuSFS 探测**：以内核为准（`/proc/config.gz` / `ksu_susfs show version`），不依赖管理器模块；隐藏协助由本模块直接 `ksud`/`ksu_susfs` 登记
