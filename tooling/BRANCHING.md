# 分支与发布

仓库默认主干为 **`master`**（无 `main`）。

## 主干与产物

| 分支 / 站点  | 用途                                              |
| ------------ | ------------------------------------------------- |
| `master`     | 源码与正式发版回写                                |
| `ci-dist`    | CI 更新通道：`update.json` + zip（与 tip 同提交） |
| GitHub Pages | 正式通道：`update.json` + `releases/` + 用户文档  |
| 功能分支     | 短生命周期；合入 `master` 后删除本地 / 远程均可   |

## 日常开发

- 用户可见改动：先写根目录 `changelog.md` → `## Unreleased`（见 [`RELEASE.md`](./RELEASE.md)）
- 文档站：改 `docs/`，本地 `npm run dev:docs`
- Zygisk so：改 `native/zygisk_hide/`，需 NDK；`npm run build:zygisk-hide`
- 功能分支定期 rebase / merge 最新 `master`，合入后删除分支

## 发版

1. 确认 `changelog.md` Unreleased 写全
2. Actions → **Release Module**，或推送 `v*` 标签
3. 工作流提升版本、导出文档站 changelog、更新 Pages

不在未备份时对 `master` / `ci-dist` 做强制推送。
