# 构建与发布说明

面向维护者。用户文档请看 [`docs/`](../docs/)。

## 仓库结构

```text
module/                 # Magisk 模块本体
  webroot/              # WebUI 可读源码
tooling/scripts/        # 构建脚本
docs/                   # VitePress 用户文档
.release / .build/      # 本地产物（不入库）
```

## 本地命令

```bash
npm install
npm run dev:web          # 预览 module/webroot
npm run build:web        # 压缩 → .build/webroot
npm run package:module   # 打 Magisk zip
npm run build:module     # build:web + package:module
npm run dev:docs
npm run build:docs
```

## 版本约定

采用语义化版本 **`vMAJOR.MINOR.PATCH`**（如 `v1.0.0`）。

| 字段 | 规则 | 示例 |
|------|------|------|
| `version` | `v` + semver | `v1.0.0` / `v1.2.3` |
| `versionCode` | `MAJOR * 10000 + MINOR * 100 + PATCH` | `10000` / `10203` |

产物 zip：`CertBridge_v1.0.0.zip`。

## 工作流

| 工作流 | 触发 | 职责 |
|--------|------|------|
| `Build Web` | `module/webroot/**` | 压缩 Web，上传 Artifact，推送 `dist-web` |
| `Build Docs` | `docs/**` | 构建并部署 GitHub Pages |
| `Package Module` | `module/**` | 仅构建 zip Artifact（不发 Release） |
| `Release Module` | 手动 / `v*` 标签 | 构建 zip + GitHub Release + 更新 update.json |

### 手动发版

1. Actions → **Release Module** → Run workflow
2. 填写版本：`1.0.0` 或 `v1.0.0`
3. 可选：预发布 / 草稿

也可本地打标签推送：

```bash
git tag v1.0.0
git push origin v1.0.0
```
