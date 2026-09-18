# CertBridge CI


- **WebUI**：使用 React 全面重构模块 webui
- **更新通道**：正式（Pages）与 CI（`ci-dist`），可检测下载，CI 可选 jsDelivr，支持无人值守刷入；
- **是否挂载 system**：支持设置 Android 14+ 是否挂载 system（`experimental_14_system`）；
- 刷新复核走 `status --live`；注入失败展示可读原因；
- **模块免重启热更新**：已安装且启用时，若本次未改 `system/`、`sepolicy.rule`、`zygisk/`，刷入后可热切换模块目录并重跑注入，无需重启；首次安装、模块禁用、或上述路径有变更时仍提示重启；失败则回退标准更新流程（保留 `update` 标记）
- **CI**：Package Module 推送 `ci-dist`（`update.json` + zip）；Build Web 只出 artifact 并串联重打包；停用 `dist-web` 作为更新通道
- **文档 / 工程**：新增 [WebUI 使用说明](/guide/webui) 与双通道、分支说明；补齐 lint / husky；修复文档站死链与打包校验问题；修复部分管理器（如 SukiSU）桥接偏晚导致 WebUI 无法执行 shell
