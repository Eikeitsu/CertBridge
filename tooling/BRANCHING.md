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
5. **`hot-reload`** — 指向 `backup/pre-reorg-master`；祖先已含隐藏/WebUI，建议在 `mount_hide`（或更后）再合入

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

# 热更新（冲突多时对照 backup/pre-reorg-master 手工移植）
git merge --no-ff hot-reload -m "merge: hot-reload 免更新"
```

## 日常开发

- 只改 CLI / 开机状态 → 基于最新 `cli`（若已合入 master 则基于 `master`）
- 只改 UI → 基于 `webui`
- 只改隐藏 → 基于 `mount_hide`
- 只改 Zygisk 原生 → 基于 `zn_module`
- 功能分支定期向下同步已合入的 `master`；**禁止**未备份时删除 `backup/*`
