# 发版与更新日志（给维护者 / AI）

> 编码改功能或修 bug 时：**先写 `changelog.md` 的 `## Unreleased`**，再改代码。  
> 用户可见的文档站日志在发版时自动生成，**不含 Unreleased**。

## 日志写哪里

| 文件                       | 用途                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| 仓库根目录 `changelog.md`  | **唯一手写源**。开发中把条目写在 `## Unreleased` 下                          |
| `docs/guide/changelog.md`  | 文档站「更新日志」页；**发版工作流生成**，勿手写 Unreleased                  |
| `docs/public/changelog.md` | Pages / `updateJson` 指向的 changelog；**发版工作流生成**，勿手写 Unreleased |

### Unreleased 写法

```markdown
## Unreleased

- 用一两句说清用户能感知的变化（修了什么 / 新增什么）
- 一条一个要点；不要写对外无关的过程措辞
```

- 发版前保持 `## Unreleased` 在 `# 更新日志` 之后最上方
- 空的 stub 可以保留
- **不要**在开发中直接新建 `## vX.Y.Z`（除非刻意补历史）

## 发版时工作流做什么

Actions → **Release Module**（或推送 `v*` tag）：

1. 打包模块 zip，创建 GitHub Release
2. `promote-changelog.py`：非空 Unreleased → 当前版本号，留下空 stub
3. `--export-docs`：文档站两份 changelog **去掉 Unreleased**
4. 更新 `update.json` / `module.prop` / `package.json` 等并推送；再触发 Build Docs

### 正式 vs CI

- **正式**：Pages `update.json` + `releases/`；`module.prop` 始终指向 Pages
- **CI**：`Package Module` push `master` 时 stamp `*.ci.N` 并推到 **`ci-dist`**
- Release「预发布」勾选只影响 GitHub 标记，不另建更新通道

## 本地命令（可选）

```bash
python3 tooling/scripts/promote-changelog.py v2.1.0 changelog.md
python3 tooling/scripts/promote-changelog.py --export-docs changelog.md \
  docs/guide/changelog.md docs/public/changelog.md
```

## 检查清单

1. 有用户可见改动 → `changelog.md` → `## Unreleased` 追加 bullet
2. 不要把 Unreleased 写进 `docs/**/changelog.md`
3. 不要删空的 `## Unreleased` stub
4. 发版用工作流，避免手改版本号漏同步

相关：`promote-changelog.py`、`prepare-release-notes.py`、`resolve-release-version.py`、`post-release-update.sh`。  
构建见 [`BUILD.md`](./BUILD.md)。
