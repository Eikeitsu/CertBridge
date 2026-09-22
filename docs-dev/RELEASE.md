# 发版与更新日志（给维护者 / AI）

> 编码改功能或修 bug 时：**只写根目录 `changelog.md` 的 `## Unreleased`（中文）**，再改代码。  
> 发版工作流会：提升版本号 → **机翻英文** → 同步文档站 → 生成 Magisk 用的**中英双语** changelog。

## 日志写哪里

| 文件 | 用途 |
| ---- | ---- |
| 根目录 `changelog.md` | **唯一手写源（中文）** |
| `changelog/en.md` | **发版机翻生成**；一般不要手改 |
| `changelog/zh-CN.md` | 根文件镜像；勿手写 |
| `docs/guide/changelog.md` | 中文站；发版生成 |
| `docs/en/guide/changelog.md` | 英文站；发版生成（来自机翻） |
| `docs/public/changelog.md` | Magisk `updateJson`；发版生成的中英并列文件 |

### Unreleased 写法

```markdown
## Unreleased

- 用一两句说清用户能感知的变化
- 一条一个要点
```

## 发版时工作流做什么

1. 打包 zip + GitHub Release  
2. `promote-changelog.py`：中文 Unreleased → `## vX.Y.Z`  
3. `sync-changelog-en.py`：把该版本中文条目 **机翻成英文** 写入 `changelog/en.md`  
   - 默认：Google 翻译（`deep-translator`，免 key）  
   - 可选：仓库 Secret `DEEPL_AUTH_KEY` 走 DeepL（质量更好）  
4. 导出文档站中/英页 + Magisk 双语 `docs/public/changelog.md`  
5. 回写 `update.json` / `module.prop` / `package.json` 并触发 Build Docs  

> Magisk 只有一个 `changelog` URL，无法按系统语言切两个链接；双语 = **同一文件上下两段**。

机翻偶发不通时：脚本会告警并尽量保留可发布状态；你可事后改 `changelog/en.md` 再推，或本地重跑：

```bash
pip install deep-translator
python3 scripts/sync-changelog-en.py v4.2.3 changelog.md changelog/en.md
python3 scripts/promote-changelog.py --export-bilingual changelog.md changelog/en.md \
  docs/public/changelog.md
```

机翻 / 导出的 `changelog/en.md`、`docs/**/changelog.md` 已加入 prettier / markdownlint **忽略**；发版回写前仍会对根 `changelog.md` 做一次 format，避免空行规则把后续 Lint 工作流卡住。

## 检查清单

1. 用户可见改动 → 只改 `changelog.md` → `## Unreleased`  
2. 不要手写 `docs/**/changelog.md`  
3. 不要删空的 `## Unreleased` stub  
4. 正式发版用工作流  

相关：`promote-changelog.py`、`sync-changelog-en.py`、`post-release-update.sh`。  
构建见 [`BUILD.md`](./BUILD.md)。
