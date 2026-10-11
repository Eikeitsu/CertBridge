# CertBridge CI


- **KernelSU Next 模块横幅**：`module.prop` 增加 `banner=banner.png`，打包打入根目录背景图（管理器模块卡片背景）
- **修复 Found KSU 回归**：收回会放大痕迹的探测——`hide_allow=0` 时 status 不再跑 ksud/SuSFS CLI；`detect_root_impl` 只报 Root 大类；默认不执行 `ksud -V`（需 `CERTBRIDGE_PROBE_KSUD=1`）；Action 只用大类；`--quick` 跳过 flavor。另减开机 nsenter：`late_inject=0` 时状态校验读 mountinfo；orphan / generation_busy 少进 ns；隐藏登记默认不扫 zygote
