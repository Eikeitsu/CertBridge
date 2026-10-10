# CertBridge CI


- **Zygisk 非目标进程 DLCLOSE**：黑名单未命中 / 过滤关闭时卸掉模块 so，避免 so 留在 maps 被春秋等检测器直接闪退；目标进程仍保留 so 并用读表过滤自藏
- **Zygisk 挂载表改擦洗不删行**：mountinfo/mounts 保留 mount id/parent，只替换本模块路径字面量，减轻删行导致的一致性命中/检测器闪退；hooks 异常改为 fail-open
- **Zygisk 挂钩目标默认藏匿名跳板 maps**：黑名单命中后默认过滤 `[anonymous]` 等 ≤4MiB 可执行匿名页（PLT 跳板，Duck Memory 主因）；`zn_hide_anon_exec=0` 可关；smaps 仍整段丢弃；readlink 改写为良性路径（不再 ENOENT）
