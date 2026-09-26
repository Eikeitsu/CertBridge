# CertBridge CI


- **SuSFS 探测收紧**：不再用 `ksud` 帮助文案 / `susfs_version` 文件判「内核已集成」；仅认 `CONFIG_KSU_SUSFS=y` 或 `ksu_susfs` 能与内核通信
- **ksud umount 探测收紧**：去掉对 `usage` 等帮助词的匹配，改为子命令/feature 实义特征
