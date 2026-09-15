# CertBridge 分支与发布顺序

仓库默认主干为 **`master`**（无 `main`）。

## 备份（勿删）

| 分支 | 说明 |
|------|------|
| `backup/pre-reorg-master` | 重组前 master tip（含热更新线，`0e7b3e0`） |
| `backup/pre-reorg-full` | 重组前完整未发布 tip（原 `zn_module`/`81dce50`） |

## 功能分支（叠放顺序）

发布 / 合入 `master` 的顺序：

1. **`cli`** — 模块脚本拆分、`status --live` / `verify`、`bin/cb`、开机状态退避与自愈、挂载 staged hardening  
2. **`webui`** — Trust Signal WebUI 源码与 `module/webroot`、相关文档与截图  
3. **`mount_hide`** — SuSFS try_umount、隐藏页后端、白名单、Zygisk 挂载过滤 so 与安装组件  
4. **`zn_module`** — 在 `mount_hide` 之上的 Zygisk/ZN 深化（可与 `mount_hide` 同 tip 起步，后续只在此分支迭代原生）  
5. **`hot-reload`** — **免重启模块热更新**（`hot_update.sh` / `hotinstall.sh`）；基于重组前 tip，建议在 `mount_hide`（或更后）再合入 master

## 合并示例

```bash
git checkout master && git pull

git merge --no-ff cli -m "merge: cli 与状态复核"
# tag / Release

git merge --no-ff webui -m "merge: webui Trust Signal"
# tag / Release

git merge --no-ff mount_hide -m "merge: mount_hide 挂载隐藏"
# tag / Release

git merge --no-ff zn_module -m "merge: zn_module Zygisk 深化"
# tag / Release

git merge --no-ff hot-reload -m "merge: hot-reload 免重启热更新"
# 仅 webroot 等非开机路径变化时可免重启；system/zygisk/注入核心仍需重启
```

## 更新通道与产物分支

| 分支 / 站点 | 用途 |
|-------------|------|
| `master` | 源码与正式发版回写 |
| `ci-dist` | CI 通道：`update.json` + `CertBridge.zip`（早期「同分支清单+产物」） |
| GitHub Pages | 正式通道：`update.json` + `releases/` |

## 日常开发

- 只改 CLI / 开机状态 → 基于最新 `cli`（若已合入 master 则基于 `master`）
- 只改 UI → 基于 `webui`
- 只改隐藏 → 基于 `mount_hide`
- 只改 Zygisk 原生 → 基于 `zn_module`
- 只改免重启热更新 → 基于 `hot-reload`
- 功能分支定期向下同步已合入的 `master`；**禁止**未备份时删除 `backup/*`
