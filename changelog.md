# CertBridge CI


- **修复证书开关保存失败回弹**：toggle 写 conf 后读回校验并先回 `ok=1`；WebUI 合并识别 stdout/stderr 契约行，延长开关超时；避免误 toast 后开关弹回
- **WebUI**：更多页拆「外观」「挂载与注入」二级页，并增加「显示隐藏页」开关；证书开关乐观更新不卡交互；Toast 按主题重做样式
- **WebUI**：统一底部抽屉（确认/证书详情/实验项同一套 chrome）；消除详情抽屉加载闪动；底栏固定 5 Tab 避免隐藏页 4→5 跳动；首屏同步主题与延迟拉日志加快启动
- **CI**：工作流升到 Node 24（`setup-node@v5` 默认 24、`checkout@v5`、artifact/pages 新版），消除 Node 20 弃用警告
- **按架构分包**：完整版默认 4 包 `*_arm64.zip` / `*_arm.zip` / `*_x86.zip` / `*_x64.zip`；另有 lite。`updateJson` / ci-dist 默认 arm64。旧式合包可用 `PACKAGE_FAT=1`
- **文档重写**：按当前模块能力重写使用手册
- **CI**：同提交改 Web 时打包门控；`INPUT_DIGEST` 去重；Lint 并行 web/shell/tooling；发版可晋升 ci-dist；接入 `setup-ndk-clang`
- **Lint/Format**：覆盖 Python（ruff）、Java（google-java-format）、C/C++（clang-format，有 native 时）
