# CertBridge CI


- **产物后缀**：32 位 ARM 包由 `*_arm.zip` / `CertBridge_arm.zip` 改为 `*_arm32.zip` / `CertBridge_arm32.zip`（armeabi-v7a）；`OPENSSL_ABIS=arm` 仍兼容
- **待重启提示**：证书开关 / 挂载模式 / 跳过 system / 路径风格等改回与开机生效快照一致时，清除「待重启」状态与主页提示
- **CI**：Release 的版本号改为高于发版时最新的 CI 版本号
