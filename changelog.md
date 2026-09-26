# CertBridge CI


- **切 Tab 不卡旧页**：隐藏/日志等首次切换先上 Loading 再挂重树；日志进页后再拉、解析用 deferred；完整 hide 探测进隐藏页再补
- **kernel_umount 探测**：热路径去掉慢的 `feature list`；`na` 不缓存（刷新可重探）；`--live` 清 feat 缓存；兼容 `kernel_umount`/`KernelUmount`/id=1
- **SuSFS 探测**：去掉 `ksud` 帮助假阳性；用 `gzip`/`toybox` 读 config.gz；认 `CONFIG_KSU_SUSFS`、`ksu_susfs` 通信、合法版本文件；阴性不缓存以免漏检
- **ksud umount 探测收紧**：去掉对 `usage` 等帮助词的匹配，改为子命令/feature 实义特征
- **隐藏助手探测减负**：status 各贵重探测只跑一次并 boot 缓存；SuSFS 廉价路径优先；文案由「已检测到」改为「可用 / 已安装 / Root 自带」等
- **首页更快可交互**：首屏只用 `status --quick`；完整 status / 日志延后；无 runtime 缓存时乐观展示已应用证书；稳定态不再一进页就 `--live`
- **kernel_umount**：对应管理器「内核级卸载 / Kernel umount」（SukiSU/ReSukiSU/KSU-Next 等 feature id=1）；探测认 feature get；页面改显示「内核级卸载」
- **热更新清探测缓存**：避免同 boot 内仍显示热更前的「未探测到内核级卸载」
