# 构建与发布说明

面向维护者。用户文档请看 [`docs/`](../docs/)。

## 仓库结构

```text
webui/                  # WebUI 源码（React + Redux Toolkit + antd）
  public/               # 会打进模块的静态资源（构建时再剔除未引用图片）
  stock/                # 库存图，不参与 Vite / 模块打包
  src/app/              # 入口组装：providers / router / store / 全局样式
  src/features/         # 业务切片：overview / certs / log / settings / theme / …
  src/shared/           # 桥接 API、配置、工具
  src/entities/         # 领域类型
module/                 # Magisk 模块本体
  bin/
    common.sh           # 路径初始化 + 按 install/runtime 加载 lib/*
    lib/                # 按功能拆分的公共库
    apex_inject.sh      # 开机 / 命名空间注入
    hot_mount.sh        # 免重启热挂载（可选）
    cert_manager.sh     # WebUI / CLI
  webroot/              # WebUI 构建产物（勿手改；由 npm run build:web 覆盖）
archives/               # 旧版原生 WebUI 归档
tooling/scripts/        # 构建脚本
docs/                   # VitePress 用户文档
.release / .build/      # 本地产物（不入库）
```

### bin/lib 职责

按入口加载；括号内为拆出的实现文件。

| 入口 / 目录 | 职责 |
| --- | --- |
| `log.sh` / `keys.sh` / `conf.sh` / `lock.sh` | 日志、音量键、配置、写锁 |
| `store.sh`（`store_target` / `store_magic`） | 目标信任库、Magic Mount、SELinux、路径身份 |
| `certs.sh` / `openssl.sh` / `app_detect.sh` | 证书合并、OpenSSL 定位、抓包 App 路径 |
| `cert_parse.sh`（`cert_info` / `cert_import`） | 显示名、详情、规范化导入 |
| `cert_sources.sh`（`cert_source_sync` / `cert_source_stash`） | Reqable/ProxyPin 源同步与快照 |
| `cert_optional.sh` | 可选 App/路径预设与已应用指纹 |
| `install_flow.sh`（`choose` / `import` / `apply`→`config`+`finish`） | 刷入安装编排 |
| `generation.sh`（`generation_build` / `generation_meta`） | 开机证书集合与 applied 元数据 |
| `status.sh`（`runtime` / `summary` / `describe` / `tag`） | 模块状态与简介 |
| `profile_status.sh` | Zygisk 过滤组件、安装档案、底座探测 |
| `inject_diag.sh`（`inject_error` / `inject_verify_diag`） | 注入失败诊断 |
| `inject/*.sh` | `apex_inject.sh` 实现（stage / bind / ops） |
| `cli_*.sh` | `cert_manager.sh` 命令实现 |
| `hot/*.sh` | `hot_mount.sh` 实现；不装热挂载时整目录删除 |
| `hide_assist.sh`（`hide_actions` / `hide_status`） | 可选 SuSFS try_umount；不装时删除三者 |
| `verify.sh` | 注入结果校验 |

`common.sh` 按 `CERTBRIDGE_PROFILE` 加载：`install` 仅装入安装所需库；默认 `runtime` 装入开机 / WebUI / Action 所需库。

## 本地命令

```bash
npm install
npm run dev:web          # Vite 开发 WebUI（webui/）
npm run build:web        # 构建并同步 → module/webroot（未引用的静态图不打入）
npm run typecheck:web    # TypeScript 检查
npm run package:module   # 打 Magisk zip（Node 统一打包，默认完整版 + Lite）
npm run build:module     # build:web + package:module
npm run build:cbx509     # 构建 Lite 用的 cbx509.dex（便携 JDK + D8）
npm run dev:docs
npm run build:docs
```

OpenSSL 打包默认只含 **arm + arm64**（真机）。需要模拟器 x86/x64 时：

```bash
# Linux / macOS
OPENSSL_ABIS=all npm run package:module

# Windows PowerShell
$env:OPENSSL_ABIS="all"; npm run package:module
```

发包版本（默认 `both`）：

```bash
PACKAGE_EDITIONS=both   # CertBridge_v*.zip + CertBridge_v*_lite.zip
PACKAGE_EDITIONS=full   # 仅完整版（内置 OpenSSL）
PACKAGE_EDITIONS=lite   # 仅 Lite（cbx509 dex，无 OpenSSL）
```

Lite 依赖设备上的 `app_process`/`dalvikvm`（Magisk 应用内刷入通常可用；纯 Recovery 环境可能无法在安装阶段解析证书，可重启后用 WebUI）。完整版 zip **不含** cbx509，仅 Lite 包含 dex。

## 版本约定

采用语义化版本 **`vMAJOR.MINOR.PATCH`**（如 `v1.0.0`）。

| 字段          | 规则                                  | 示例                |
| ------------- | ------------------------------------- | ------------------- |
| `version`     | `v` + semver                          | `v1.0.0` / `v1.2.3` |
| `versionCode` | `MAJOR * 10000 + MINOR * 100 + PATCH` | `10000` / `10203`   |

产物 zip：`CertBridge_v1.0.0.zip`。

## 工作流

共用 composite：`.github/actions/setup-node-npm`（Node 24 + `npm ci`）。

| 工作流           | 触发                | 职责                                                                 |
| ---------------- | ------------------- | -------------------------------------------------------------------- |
| `Build Web`      | `module/webroot/**` | 压缩 Web → Artifact；push/手动再发布 `dist-web`（独立 job）          |
| `Build Docs`     | `docs/**`           | 构建并部署 GitHub Pages                                              |
| `Package Module` | `module/**`         | 仅构建 zip Artifact（不发 Release）                                  |
| `Release Module` | 手动 / `v*` 标签    | `build` 打包 → `publish` 发 Release → `post` 回写主分支 / 触发文档站 |

发版脚本：`resolve-release-version.py`、`post-release-update.sh`（见 [`RELEASE.md`](./RELEASE.md)）。

### 手动发版

1. 开发中把用户可见改动写在根目录 `changelog.md` → `## Unreleased`（详见 [`RELEASE.md`](./RELEASE.md)）
2. Actions → **Release Module** → Run workflow
3. 填写版本：`1.0.0` 或 `v1.0.0`
4. 可选：预发布 / 草稿
5. 工作流会：提升 Unreleased → 版本号；文档站两份 changelog **不含 Unreleased**；Release 正文优先取版本节（否则回退 Unreleased）+ GitHub Full Changelog

也可本地打标签推送：

```bash
git tag v1.0.0
git push origin v1.0.0
```
