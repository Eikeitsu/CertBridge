# CertBridge CI


- **Zygisk 非目标进程 DLCLOSE**：黑名单未命中 / 过滤关闭时卸掉模块 so，避免 so 留在 maps 被春秋等检测器直接闪退；目标进程仍保留 so 并用读表过滤自藏
