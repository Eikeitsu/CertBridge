# CertBridge CI


- **证书开关**：修复开启时 `addon_ensure_ready`/`sync` 污染全局 `name`，把错误键写入 user.conf 导致开关弹回；关开回原时正确清除待重启
