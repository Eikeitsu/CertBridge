# CertBridge CI


- **晚注入开关**：`late_inject`（默认关）。关时 `service.sh` 只收尾写状态，不再 `namespaces` 注入（仅 boot 注入、痕迹更少，减轻 Found KSU 类误伤）；开时 boot_completed 后再补应用命名空间，开启瞬间也会后台补一次。WebUI「隐藏」页可调；升级保留原值，缺省按 0
- **CLI 友好化**：`cb help` / `-h` 分组说明；常用缩写（如 `st`/`li`/`hm`）；统一 `get`/`set <key>`；未知命令返回 `error=unknown_command` 并提示接近名称
