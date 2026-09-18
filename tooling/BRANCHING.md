# CertBridge 分支与发布顺序

仓库默认主干为 **`master`**（无 `main`）。

## 备份（勿删）

| 分支                      | 说明                                               |
| ------------------------- | -------------------------------------------------- |
| `backup/pre-reorg-master` | 重组前 master tip（含热更新线，`0e7b3e0`）         |
| `backup/pre-reorg-full`   | 重组前完整未发布 tip（原 `zn_module`/`81dce50`）   |
| `backup/hot-reload`       | 重组前热更新功能分支 tip（由旧 `hot-reload` 改名） |

## 功能分支（叠放顺序）

发布 / 合入 `master` 的顺序：

1. **`cli`** / **`webui`** / **`hot-reload`** — 已合入或可按原计划合入
2. **`umount_hide`** — SuSFS / KernelSU **try_umount**、挂载隐藏协助、临时层路径与隐藏文档（当前开发）
3. **Zygisk / ZN 过滤** — 另开分支（经典 Zygisk so / ZN Module）；在 `umount_hide` 合入 `master` 之后再合

> 旧分支 `mount_hide`、`zn_module` 仅作参考，功能迁完后可删除。

## 合并示例

```bash
git checkout master && git pull

git merge --no-ff umount_hide -m "merge: umount_hide 挂载 umount 隐藏"
# tag / Release

# 再合 Zygisk/ZN 过滤功能分支
```

## 更新通道与产物分支

| 分支 / 站点  | 用途                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `master`     | 源码与正式发版回写                                                   |
| `ci-dist`    | CI 通道：`update.json` + `CertBridge.zip`（早期「同分支清单+产物」） |
| GitHub Pages | 正式通道：`update.json` + `releases/`                                |

## 日常开发

- 只改 SuSFS / try_umount / 隐藏协助 → 基于 `umount_hide`
- 只改 Zygisk / ZN 原生过滤 → 基于对应 Zygisk 分支（先同步已合入的 `umount_hide` / `master`）
- 功能分支定期向下同步已合入的 `master`；**禁止**未备份时删除 `backup/*`
