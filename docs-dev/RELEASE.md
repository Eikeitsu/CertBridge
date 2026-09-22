# 发版与更新日志（给维护者 / AI）

> 编码改功能或修 bug 时：**先写 `changelog/zh-CN.md`（及英文 `changelog/en.md`）的 `## Unreleased`**，再改代码。  
> 根目录 `changelog.md` 与中文源同步，供 Magisk `updateJson` 兼容。  
> 用户可见的文档站日志在发版时自动生成，**不含 Unreleased**。

## 日志写哪里

| 文件 | 用途 |
| ---- | ---- |
| `changelog/zh-CN.md` | **中文手写源**。开发中把条目写在 `## Unreleased` 下 |
| `changelog/en.md` | **英文手写源**（短句）；发版同步提升 |
| 根目录 `changelog.md` | 与 `zh-CN` 镜像；`updateJson` / Pages 默认指向此文件 |
| `docs/guide/changelog.md` | 文档站中文日志；**发版工作流生成** |
| `docs/en/guide/changelog.md` | 文档站英文日志；**发版工作流生成** |
| `docs/public/changelog.md` | Pages / `updateJson` 指向；**发版工作流生成** |

### Unreleased 写法

```markdown
## Unreleased

- 用一两句说清用户能感知的变化（修了什么 / 新增什么）
- 一条一个要点；不要写对外无关的过程措辞
```

- 发版前保持 `## Unreleased` 在标题之后最上方
- 空的 stub 可以保留
- **不要**在开发中直接新建 `## vX.Y.Z`（除非刻意补历史）

## 发版时工作流做什么

Actions → **Release Module**（或推送 `v*` tag）：

1. 打包模块 zip，创建 GitHub Release
2. `promote-changelog.py`：中英 Unreleased → 当前版本号，留下空 stub；同步根 `changelog.md`
3. `--export-docs`：文档站 changelog **去掉 Unreleased**（中 + 英）
4. 更新 `update.json` / `module.prop` / `package.json` 等并推送；再触发 Build Docs

### 正式 vs CI

- **正式**：Pages `update.json` + `releases/`；`module.prop` 始终指向 Pages
- **CI**：`Package Module` push `master` 时 stamp `*.ci.N` 并推到 **`ci-dist`**
- Release「预发布」勾选只影响 GitHub 标记，不另建更新通道
- **versionCode**：正式先按 semver 映射；仅当 Pages/ci-dist 等已见号**高于**该映射时，改为「已见最大 + 1」，避免发版晚于 CI 却 versionCode 倒挂

## 本地命令（可选）

```bash
python3 scripts/promote-changelog.py v2.1.0 changelog/zh-CN.md
python3 scripts/promote-changelog.py v2.1.0 changelog/en.md
python3 scripts/promote-changelog.py --export-docs changelog/zh-CN.md \
  docs/guide/changelog.md docs/public/changelog.md
python3 scripts/promote-changelog.py --export-docs changelog/en.md \
  docs/en/guide/changelog.md
```

## 检查清单

1. 有用户可见改动 → `changelog/zh-CN.md` + `changelog/en.md` → `## Unreleased` 追加 bullet
2. 不要把 Unreleased 写进 `docs/**/changelog.md`
3. 不要删空的 `## Unreleased` stub
4. 发版用工作流，避免手改版本号漏同步

相关：`promote-changelog.py`、`prepare-release-notes.py`、`resolve-release-version.py`、`post-release-update.sh`。  
构建见 [`BUILD.md`](./BUILD.md)。
