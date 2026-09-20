# CertBridge CI


- **晚注入开关**：`late_inject`（默认关）。关时 `service.sh` 只收尾写状态，不再 `namespaces` 注入（仅 boot 注入、痕迹更少，减轻 Found KSU 类误伤）；开时 boot_completed 后再补应用命名空间，开启瞬间也会后台补一次。WebUI「隐藏」页可调；升级保留原值，缺省按 0
- **CLI 友好化**：`cb help` / `-h` 分组说明；常用缩写（如 `st`/`li`/`hm`）；统一 `get`/`set <key>`；未知命令返回 `error=unknown_command` 并提示接近名称
- **外部目录收敛**：无人值守标记与热更新副本/worker 统一到 `/data/adb/certbridge/`，用完删空目录；卸载清理该目录及历史 `.certbridge_*` 残留
- **进一步减少开机痕迹**：`late_inject=0` 时 boot 绑定跳过整库 cksum、orphan 拆临时层不再进 zygote、service/heal 状态只核 init（不 nsenter zygote）；boot zygote PID 去重。难机可开 `late_inject=1` 恢复完整复核；调试可设 `CERTBRIDGE_VERIFY_ZYGOTE=1`
