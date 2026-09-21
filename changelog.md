# CertBridge CI


> 为了减小模块体积，从 **4.2.1** 开始按架构分包
>
> 多数人一般安装 `arm64` 架构的模块即可，模拟器虚拟机请自行选择合适的架构

- **按架构分包**：完整版默认 4 包 `*_arm64.zip` / `*_arm.zip` / `*_x86.zip` / `*_x64.zip`；另有 lite。`updateJson` / ci-dist 默认 `CertBridge_arm64.zip`。旧式合包 `PACKAGE_FAT=1` → `*_fat.zip`
- **证书开关**：关/开写入 `data/state/user.conf`（不再依赖模块目录 `config/certs.conf` 的不可靠写回）；本地证快照与热更新保留 `sources` / `source-stash` / `user.conf`；WebUI 隔离 ns 可经 init 探测导入
- **WebUI**：首屏内联 loading + 主题色，CSS 先于 JS，先进壳层再拉 status；更多页拆「外观」「挂载与注入」并支持「显示隐藏页」；统一底部抽屉动画；Toast / 开关交互与底栏 Tab 稳定性改进
- **文档重写**：按当前模块能力重写使用手册
- **CI / 工程**：Node 24；同提交改 Web 时打包门控；`INPUT_DIGEST` 去重；Lint 并行 web/shell/tooling；发版可晋升 ci-dist；接入 `setup-ndk-clang`；Lint/Format 覆盖 Python / Java / C/C++（有 native 时）
