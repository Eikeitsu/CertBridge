# CertBridge CI


> 解决了春秋检测词条：Found ksu/免解设备
> 如果依然还有该检测词条，请检查是否使用了其它 mount 模块

- **冷门实验默认痕迹最少**：`boot_bind_zygote` / `boot_multi_apex` / `service_probe` 默认均为 `0`；证书异常时再在「冷门实验」打开兼容项。升级若已有旧值会保留
- **开机加速（不改双模式）**：无残留跳过 detach；generation 用轻量 source 指纹 + 整目录拷贝；当前 ns 已是 init 则不再 nsenter pid1；`late_inject=0` 绑定时去掉可见性/整库探测只留 mount --bind
- **冷门实验语义补齐**：`boot_multi_apex=0` 在 14+ 仅主 APEX（跳过 `@版本` 与 system）；`late_inject=0` 时 service 自动不退避、不 heal。打开 `boot_multi_apex=1` 仍完整走双模式目标列表
- **开机加速（此前）**：APEX/`@版本` 共用同一 tmpfs 层；`generation_source_busy` 不扫全机 `/proc`；无热会话跳过 hot unmount；detach 重试收敛
- **冷门实验子页**：强注 / 晚注入 / 上述三项收入「隐藏 → 冷门实验」
- **晚注入开关**：`late_inject`（默认关）
- **CLI 友好化**：`cb help` / 缩写 / 统一 `get`/`set`
- **外部目录收敛**：热更新等到 `/data/adb/certbridge/`
- **进一步减少开机痕迹**：`late_inject=0` 时跳过整库 cksum、orphan 不进 zygote、状态默认只核 init
