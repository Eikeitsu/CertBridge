# CertBridge CI


> 为了减小模块体积，从 **4.2.1** 开始按架构分包
>
> 多数人一般安装 `arm64` 架构的模块即可，模拟器虚拟机请自行选择合适的架构

- **WebUI 首屏**：去掉整页开屏等待，先进壳层；顶栏进度条表示加载；status 优先拉取，设备名/自定义列表后台补齐
- **WebUI**：`index.html` 注入首屏背景色，减轻 JS/CSS 加载前的白屏
- **修复关后再开找不到证**：关闭前先快照；开启时先恢复 stash/生效集再 sync；sync 换目录失败会回滚，不再清空 sources
- **修复关闭证书开关误报保存失败**：读回校验轻量重试；失败只回滚该开关，避免全量 refresh 把开关弹回绿色
- **修复安装跳过后再开找不到证**：WebUI `exec` 常在隔离 mount ns，扫不到 App 的 `Android/data`；经 init ns 探测并必要时拷出后再导入。status 在仅有 App 侧证书时也标「可用」
- **WebUI 抽屉过渡**：底部抽屉 / 确认条 / 图片预览按 `data-state` 做进出场动画，关闭不再瞬间消失
- **修复证书开关保存失败回弹**：toggle 写 conf 后读回校验并先回 `ok=1`；WebUI 合并识别 stdout/stderr 契约行，延长开关超时；避免误 toast 后开关弹回
- **WebUI**：更多页拆「外观」「挂载与注入」二级页，并增加「显示隐藏页」开关；证书开关乐观更新不卡交互；Toast 按主题重做样式
- **WebUI**：统一底部抽屉（确认/证书详情/实验项同一套 chrome）；消除详情抽屉加载闪动；底栏固定 5 Tab 避免隐藏页 4→5 跳动；首屏同步主题与延迟拉日志加快启动
- **CI**：工作流升到 Node 24（`setup-node@v5` 默认 24、`checkout@v5`、artifact/pages 新版），消除 Node 20 弃用警告
- **按架构分包**：完整版默认 4 包 `*_arm64.zip` / `*_arm.zip` / `*_x86.zip` / `*_x64.zip`；另有 lite。`updateJson` / ci-dist 默认 `CertBridge_arm64.zip`。旧式合包 `PACKAGE_FAT=1` → `*_fat.zip`
- **文档重写**：按当前模块能力重写使用手册
- **CI**：同提交改 Web 时打包门控；`INPUT_DIGEST` 去重；Lint 并行 web/shell/tooling；发版可晋升 ci-dist；接入 `setup-ndk-clang`
- **Lint/Format**：覆盖 Python（ruff）、Java（google-java-format）、C/C++（clang-format，有 native 时）
