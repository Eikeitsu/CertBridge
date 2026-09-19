# CertBridge CI


- **关闭 hide_allow 即时卸登记**：清 try_umount.txt / NoHello 的同时对已知 cacerts 路径执行 `ksud kernel umount del`（不 wipe 全表）
