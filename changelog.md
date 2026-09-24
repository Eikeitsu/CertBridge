# CertBridge CI


- **Zygisk 挂载过滤**：过滤 mountinfo/mounts、maps/smaps；弱化 map_files readlink，默认不需要，按需安装
- **SuSFS 探测**：以内核为准（`/proc/config.gz` / `ksu_susfs show version`），不依赖管理器模块；隐藏协助由本模块直接 `ksud`/`ksu_susfs` 登记
