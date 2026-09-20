# 构建与发布说明

面向维护者。用户文档请看 [`docs/`](../docs/) 或 [在线文档](https://eikeitsu.github.io/CertBridge/)。

## 仓库结构

```text
webui/                  # WebUI（React + Redux Toolkit）
module/                 # Magisk 模块本体
  bin/                  # common + lib/* + apex_inject / hot_mount / cert_manager / cb
  certs/                # builtin / sources / custom / generation
  config/               # certs.conf、zn_whitelist.txt
  zygisk/               # 构建产出的 *.so（勿手改 README）
  webroot/              # WebUI 构建产物（npm run build:web 覆盖）
native/zygisk_hide/     # Zygisk 挂载过滤源码（NDK 构建）
archives/               # 旧版原生 WebUI 归档（不打包）
tooling/scripts/        # 构建 / 发版 / changelog
docs/                   # VitePress 用户文档
.release / .build/      # 本地产物（不入库）
```

### bin/lib 职责（摘要）

| 区域                              | 职责                                  |
| --------------------------------- | ------------------------------------- |
| `conf` / `log` / `keys`           | 配置、日志、音量键                    |
| `store_*` / `inject/*`            | 信任库目标、Magic Mount、bind / stage |
| `certs` / `cert_*` / `generation` | 合并、导入、开机证书集                |
| `install_*`                       | 刷入选择与应用                        |
| `cli_*` / `cert_manager.sh`       | WebUI / CLI                           |
| `hot/*`                           | 免重启热挂载                          |
| `hide_*`                          | SuSFS / 内核 umount 协助              |
| `profile_status`                  | Zygisk 组件与安装档案状态             |

`common.sh` 按 `CERTBRIDGE_PROFILE` 加载：`install` 仅安装库；默认 `runtime` 装入开机 / WebUI / Action。

## 本地命令

```bash
npm install
npm run check                 # typecheck + 全量 lint + prettier
npm run lint                  # js/style/md/shell/py/java/clang
npm run format                # prettier
npm run format:all            # prettier + lint --fix
npm run dev:web
npm run build:web
npm run typecheck:web
npm run build:cbx509          # Lite 用 dex
npm run package:module        # 打 zip（默认完整版 + Lite）
npm run build:module          # build:web + package:module（有 Zygisk 源码时 CI 会编 so）
npm run dev:docs
npm run build:docs
```

存在 `native/zygisk_hide/` 与 `npm run build:zygisk-hide` 时：CI 使用 `.github/actions/setup-ndk-clang`；本地可 `SKIP_ZYGISK_HIDE=1` 跳过；`REQUIRE_ZYGISK_HIDE=1` 强制编 so。无 so 时仍可打包，自定义安装勾选 Zygisk 过滤会提示缺组件。

### Lint 覆盖

| 种类     | 命令         | 工具                                |
| -------- | ------------ | ----------------------------------- |
| TS/JS    | `lint:js`    | ESLint                              |
| SCSS/CSS | `lint:style` | Stylelint                           |
| Markdown | `lint:md`    | markdownlint-cli2                   |
| Shell    | `lint:shell` | ShellCheck                          |
| Python   | `lint:py`    | ruff                                |
| Java     | `lint:java`  | google-java-format                  |
| C/C++    | `lint:clang` | clang-format（无 `native/` 则跳过） |
| 格式化   | `format`     | Prettier（含 `.github` yml）        |

CI `Lint` 工作流拆为 **web / shell / tooling** 三 job + gate。

### 打包与发版 CI

- **门控**：同提交改了 `webui/` 等时，push 上的 Package 会 skip，等 Build Web 成功后的 `workflow_run` 再打
- **去重**：`module-input-digest.sh` 与 `ci-dist/INPUT_DIGEST` 相同则跳过重建
- **发版**：`Release Module` 可选「晋升 CI」——从 `ci-dist` 拉 zip 只重盖正式 version（`promote-ci-module-zips.sh`）

OpenSSL ABI 与发包版本：

```bash
OPENSSL_ABIS=arm,arm64   # 默认；模拟器可 all
PACKAGE_EDITIONS=both    # full | lite | both
```

## 版本约定

语义化版本 **`vMAJOR.MINOR.PATCH`**；`versionCode = MAJOR*10000 + MINOR*100 + PATCH`。

产物：`CertBridge_v1.0.0.zip` / `CertBridge_v1.0.0_lite.zip`。

## 工作流

| 工作流           | 触发                                   | 职责                                                    |
| ---------------- | -------------------------------------- | ------------------------------------------------------- |
| `Lint`           | push / PR                              | 并行 web / shell / tooling + gate                       |
| `Build Web`      | `webui/**`                             | 构建 Web Artifact                                       |
| `Build Docs`     | `docs/**`                              | 构建并部署 GitHub Pages                                 |
| `Package Module` | `module/**` / `webui/**` / `native/**` | 门控 + digest；打 zip；push 时发布 `ci-dist`            |
| `Release Module` | 手动 / `v*` 标签                       | 重建或晋升 ci-dist；Release + Pages `update.json` / zip |

### 更新通道

| 通道 | 检测                | 下载                       |
| ---- | ------------------- | -------------------------- |
| 正式 | Pages `update.json` | Pages `releases/*.zip`     |
| CI   | `ci-dist` 根目录    | 同分支 `CertBridge.zip` 等 |

管理器自带更新始终跟正式通道。WebUI「更多」可切 CI。

发版细节与 changelog 约定见 [`RELEASE.md`](./RELEASE.md)。分支说明见 [`BRANCHING.md`](./BRANCHING.md)。
