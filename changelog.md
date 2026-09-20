# CertBridge CI


- **按架构分包**：完整版默认 4 包 `*_arm64.zip` / `*_arm.zip` / `*_x86.zip` / `*_x64.zip`；另有 lite。`updateJson` / ci-dist 默认 arm64。旧式合包可用 `PACKAGE_FAT=1`
- **文档重写**：按当前模块能力重写使用手册
- **CI**：同提交改 Web 时打包门控；`INPUT_DIGEST` 去重；Lint 并行 web/shell/tooling；发版可晋升 ci-dist；接入 `setup-ndk-clang`
- **Lint/Format**：覆盖 Python（ruff）、Java（google-java-format）、C/C++（clang-format，有 native 时）
