# 挂载隐藏说明

证书桥通过 **bind mount** 将合并后的 CA 写入系统信任库路径。检测方仍可能从 `mountinfo`、路径特征或 trust store 内容发现异常。**换临时层路径不能替代 umount**；真正有效的隐藏依赖 SuSFS、Shamiko、ZygiskNext / ReZygisk / NeoZygisk 等对目标进程的 **umount**。

WebUI 底部 **「隐藏」** 页会展示本机探测到的隐藏助手与 `try_umount` 注册状态，并分 Root 方案给出配置建议。

---

## 诚实边界（请先读）

| 事实 | 说明 |
| ---- | ---- |
| 路径迁移 | 默认临时层在 `/dev/.cb*` 是为避开对 `/data/local/tmp` 的关键词扫描，**不能**让 bind 消失 |
| 无助手时 | 没有 SuSFS / Zygisk umount 助手时，读 mountinfo 的检测仍可能发现 cacerts 上的 bind |
| 注入方式 | 不存在类似 ZN-hostsredirect 的「无挂载 CA 注入」公共方案；证书必须写入信任库路径才能被系统 TLS 使用 |

---

## Magisk / Magisk Alpha / Kitsune

### 排除列表（DenyList）

在 Magisk App **「配置排除列表」** 勾选要对之隐藏 Root 的应用包名。这是 Magisk v24 起替代 **MagiskHide** 的机制，**不是**旧版 Hide。

### 强制执行排除列表（Enforce DenyList）

开启后主要对列表内 App **停用 Zygisk 模块注入**，**不等于**完整隐藏 bind mount。

与 **Shamiko** 常见用法冲突：使用 Shamiko 时通常应 **关闭 Enforce**，把目标 App 放进排除列表，由 Shamiko 处理挂载隐藏。

### Zygisk 助手模块

Magisk 可安装 **ZygiskNext**、**ReZygisk**、**NeoZygisk**（通常需关闭内置 Zygisk），它们同样能对目标进程 umount 模块挂载痕迹。

### 常见组合

- **Shamiko** + 排除列表（关闭 Enforce）
- **ZygiskNext / ReZygisk / NeoZygisk** 的 umount / 遵循排除列表
- **Zygisk Assistant / NoHello**（偏 bind mount 隐藏）

---

## KernelSU / SukiSU / MKSU

1. 对目标 App 开启管理器的 **「卸载模块 / Umount modules」**，并确保内核支持 `path_umount`（GKI 或已 backport）。
2. **SuSFS**：若内核与用户空间工具可用，证书桥会在 bind 成功后自动 `add_try_umount` 到 cacerts 路径；WebUI **隐藏页** 会显示「已注册」。
3. 可叠加 **NeoZygisk**、**ReZygisk** 或 **ZygiskNext**「仅还原挂载 / umount only」。
4. 避免与 **Magical OverlayFS** 等冲突模块同时启用。

---

## APatch

1. 对目标 App 启用 **「排除修改（Exclude Modifications）」**。
2. 建议安装 **NeoZygisk**、**ReZygisk** 或 **ZygiskNext**（umount only），与 [bindhosts 隐藏指南](https://github.com/bindhosts/bindhosts) 一致。
3. 也可使用 **Zygisk Assistant / NoHello** 辅助隐藏 bind mount。

---

## 与本模块相关的配置

| 配置 | 位置 | 说明 |
| ---- | ---- | ---- |
| 临时层路径 | WebUI「更多 → 临时挂载路径」或 `certs.conf` 的 `tmpfs_style` | `dev`（默认）/ `short` / `legacy`；切换后需重启 |
| SuSFS try_umount | 自动 | bind 成功后由 `hide_assist.sh` 注册；详见 WebUI **隐藏页** 实况卡 |
| 挂载模式 | WebUI「更多 → 挂载模式」 | 完整兼容 vs 轻量 Magic；见 [配置说明 · 挂载模式](/guide/config#挂载模式) |

---

## 参考

- WebUI：[WebUI 使用说明 · 隐藏页](/guide/webui#隐藏)
- 配置：[配置说明 · 临时挂载路径](/guide/config#临时挂载路径-tmpfs_style)
- 外部：[bindhosts](https://github.com/bindhosts/bindhosts)（hosts 重定向模块的隐藏思路，证书 bind 场景可类比 umount 需求）
