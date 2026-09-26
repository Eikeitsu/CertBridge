# CertBridge CI


- **SuSFS 探测**：去掉 `ksud` 帮助假阳性；用 `gzip`/`toybox` 读 config.gz；认 `CONFIG_KSU_SUSFS`、`ksu_susfs` 通信、合法版本文件；阴性不缓存以免漏检
- **ksud umount 探测收紧**：去掉对 `usage` 等帮助词的匹配，改为子命令/feature 实义特征
- **隐藏助手探测减负**：status 各贵重探测只跑一次并 boot 缓存；SuSFS 廉价路径优先；文案由「已检测到」改为「可用 / 已安装 / Root 自带」等
