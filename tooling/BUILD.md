# 构建与发布说明

面向维护者。用户文档请看 [`docs/`](../docs/)。

## 仓库结构

```text
module/                 # Magisk 模块本体
  bin/
    common.sh           # 路径初始化 + 按 install/runtime 加载 lib/*
    lib/                # 按功能拆分的公共库
      # 证书域: app_detect / cert_parse / cert_sources
      # 安装: install_flow（仅刷入时加载）
    apex_inject.sh      # 开机 / 命名空间注入
    hot_mount.sh        # 免重启热挂载（可选）
    cert_manager.sh     # WebUI / CLI
  webroot/              # WebUI 可读源码
tooling/scripts/        # 构建脚本
docs/                   # VitePress 用户文档
.release / .build/      # 本地产物（不入库）
```

### bin/lib 职责

| 文件 | 职责 |
| --- | --- |
| `log.sh` | 安装/运行日志 |
| `keys.sh` | 音量键选择 |
| `conf.sh` | `certs.conf` 读写 |
| `lock.sh` | 写锁 |
| `store.sh` | 信任库路径、SELinux、路径身份 |
| `certs.sh` | 证书文件名、复制、addon 合并 |
| `openssl.sh` | OpenSSL 定位 |
| `app_detect.sh` | 已安装抓包 App 的 CA 路径探测 |
| `cert_parse.sh` | 显示名 / 详情解析、规范化导入 |
| `cert_sources.sh` | sources 同步与 addon 查找（含 ProxyPin 内置） |
| `install_flow.sh` | 刷入安装编排（仅 `CERTBRIDGE_PROFILE=install`） |
| `verify.sh` | 注入结果校验 |
| `generation.sh` | 开机证书集合生成 |
| `status.sh` | 模块状态标签与描述 |

`common.sh` 按 `CERTBRIDGE_PROFILE` 加载：`install` 仅装入安装所需库；默认 `runtime` 装入开机 / WebUI / Action 所需库。

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

| 字段          | 规则                                  | 示例                |
| ------------- | ------------------------------------- | ------------------- |
| `version`     | `v` + semver                          | `v1.0.0` / `v1.2.3` |
| `versionCode` | `MAJOR * 10000 + MINOR * 100 + PATCH` | `10000` / `10203`   |

产物 zip：`CertBridge_v1.0.0.zip`。

## 工作流

| 工作流           | 触发                | 职责                                         |
| ---------------- | ------------------- | -------------------------------------------- |
| `Build Web`      | `module/webroot/**` | 压缩 Web，上传 Artifact，推送 `dist-web`     |
| `Build Docs`     | `docs/**`           | 构建并部署 GitHub Pages                      |
| `Package Module` | `module/**`         | 仅构建 zip Artifact（不发 Release）          |
| `Release Module` | 手动 / `v*` 标签    | 构建 zip + GitHub Release + 更新 update.json |

### 手动发版

1. Actions → **Release Module** → Run workflow
2. 填写版本：`1.0.0` 或 `v1.0.0`
3. 可选：预发布 / 草稿
4. Release 正文会自动摘取 `changelog.md` 中与当前版本匹配的章节（若有），并保留 GitHub 生成的 Full Changelog

也可本地打标签推送：

```bash
git tag v1.0.0
git push origin v1.0.0
```
