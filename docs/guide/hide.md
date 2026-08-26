# 挂载隐藏说明

证书桥通过 **bind mount** 将合并后的 CA 写入系统信任库路径。检测方仍可能从 `mountinfo`、路径特征或 trust store 内容发现异常。**换临时层路径不能替代 umount**；真正有效的隐藏依赖 SuSFS、Shamiko、ZygiskNext / ReZygisk / NeoZygisk 等对目标进程的 **umount**。

## 可选组件

挂载隐藏协助（`bin/lib/hide_assist.sh`）随安装方案写入开关默认值：

| 安装方式   | 是否安装隐藏组件 | `hide_allow` 默认                         |
| ---------- | ---------------- | ----------------------------------------- |
| 默认安装   | **安装**         | **关闭**（`0`；可在 WebUI「隐藏」页开启） |
| 自定义安装 | 音量键可选       | 勾选后 **开启**（`1`；可在 WebUI 关闭）   |

未安装时（仅自定义安装跳过该项）：

- 设备上不保留 `hide_assist.sh`，不写 `data/state/hide-assist.conf`
- WebUI **不显示「隐藏」页**

已安装时：

- WebUI 出现「隐藏」页，顶部有 **启用开关**（`hide_allow`）
- 开关打开时，注入 / 热挂载成功会向 SuSFS / 内核登记 `try_umount`
- 关闭开关会清除本模块记录的隐藏状态文件；内核侧登记通常需**重启**才清掉

WebUI 隐藏页会展示本机探测到的隐藏助手与 `try_umount` 注册状态，并分 Root 方案给出配置建议。

---

## 抓包必读：不要对抓包链路开「卸载模块」

证书要生效，进程必须能看到 cacerts 上的 **bind**。对某个 App 开启 Root 隐藏里的 **卸载模块 / Umount modules**（KernelSU）、**DenyList + Shamiko / Zygisk umount**（Magisk）、**排除修改**（APatch）等，会在该进程命名空间里卸掉模块挂载——**证书层也会一起被卸掉**。

| 对象                              | 若对其开启了 umount / 卸载模块 | 常见表现                       |
| --------------------------------- | ------------------------------ | ------------------------------ |
| **Reqable / ProxyPin** 等抓包软件 | 软件读不到系统信任库里的 CA    | 软件内显示「**根证书未安装**」 |
| **被抓包的目标 App**              | TLS 看不到抓包 CA              | **断网**、证书错误、握手失败   |

**正确做法：**

1. 对 **Reqable / ProxyPin**：**关闭**「卸载模块 / 排除修改」等 Root 隐藏；不要把它们放进会触发 umount 的排除列表。
2. 对 **本次要抓包的目标 App**：同样 **关闭** 卸载模块 / umount 类隐藏，否则流量进隧道后仍会因证书失败而断网。
3. 仅对「需要躲检测、且**不参与本次抓包**」的其它 App，再单独开启卸载模块或排除列表。

本模块的 `hide_allow` / SuSFS `try_umount` 是向内核登记 cacerts 路径；**某个进程会不会被卸挂载，仍取决于你是否对该进程启用了 umount**。抓包前请先核对抓包软件与目标 App 的隐藏开关。

---

## 诚实边界（请先读）

| 事实     | 说明                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------- |
| 路径迁移 | 默认临时层在 `/dev/.cb*` 是为避开对 `/data/local/tmp` 的关键词扫描，**不能**让 bind 消失            |
| 无助手时 | 没有 SuSFS / Zygisk umount 助手时，读 mountinfo 的检测仍可能发现 cacerts 上的 bind                  |
| 注入方式 | 不存在类似 ZN-hostsredirect 的「无挂载 CA 注入」公共方案；证书必须写入信任库路径才能被系统 TLS 使用 |

---

## Magisk / Magisk Alpha / Kitsune

### 排除列表（DenyList）

在 Magisk App **「配置排除列表」** 勾选要对之隐藏 Root 的应用包名。这是 Magisk v24 起替代 **MagiskHide** 的机制，**不是**旧版 Hide。

### 强制执行排除列表（Enforce DenyList）

开启后主要对列表内 App **停用 Zygisk 模块注入**，**不等于**完整隐藏 bind mount。

与 **Shamiko** 常见用法冲突：使用 Shamiko 时通常应 **关闭 Enforce**，把目标 App 放进排除列表，由 Shamiko 处理挂载隐藏。

**不要**把 Reqable、ProxyPin 或正在抓包的目标 App 放进会触发 umount 的排除列表，否则会出现「根证书未安装」或抓包断网。详见上文 [抓包必读](#抓包必读不要对抓包链路开卸载模块)。

### Zygisk 助手模块

Magisk 可安装 **ZygiskNext**、**ReZygisk**、**NeoZygisk**（通常需关闭内置 Zygisk），它们同样能对目标进程 umount 模块挂载痕迹。

### 常见组合

- **Shamiko** + 排除列表（关闭 Enforce）
- **ZygiskNext / ReZygisk / NeoZygisk** 的 umount / 遵循排除列表
- **Zygisk Assistant / NoHello**（偏 bind mount 隐藏）

---

## KernelSU / SukiSU / MKSU

1. **仅对需要躲检测的 App** 开启管理器的 **「卸载模块 / Umount modules」**，并确保内核支持 `path_umount`（GKI 或已 backport）。
2. **Reqable、ProxyPin、被抓包目标**：**不要**开「卸载模块」，否则会出现「根证书未安装」或抓包断网。
3. **SuSFS**：若已安装隐藏组件并开启 `hide_allow`，证书桥会在 bind 成功后自动 `add_try_umount` 到 cacerts 路径；WebUI **隐藏页** 会显示「已注册」。
4. 可叠加 **NeoZygisk**、**ReZygisk** 或 **ZygiskNext**「仅还原挂载 / umount only」（同样不要对抓包链路 App 启用）。
5. 避免与 **Magical OverlayFS** 等冲突模块同时启用。

---

## APatch

1. **仅对需要躲检测的 App** 启用 **「排除修改（Exclude Modifications）」**。
2. **不要**对 Reqable / ProxyPin / 被抓包目标启用排除修改。
3. 建议安装 **NeoZygisk**、**ReZygisk** 或 **ZygiskNext**（umount only），与 [bindhosts 隐藏指南](https://github.com/bindhosts/bindhosts) 一致。
4. 也可使用 **Zygisk Assistant / NoHello** 辅助隐藏 bind mount。

---

## 与本模块相关的配置

| 配置             | 位置                                                         | 说明                                                                     |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 临时层路径       | WebUI「更多 → 临时挂载路径」或 `certs.conf` 的 `tmpfs_style` | `dev`（默认）/ `short` / `legacy`；切换后需重启                          |
| SuSFS try_umount | 可选组件 + WebUI 开关                                        | 安装隐藏组件并开启 `hide_allow` 后，bind 成功由 `hide_assist.sh` 注册    |
| 挂载模式         | WebUI「更多 → 挂载模式」                                     | 完整兼容 vs 轻量 Magic；见 [配置说明 · 挂载模式](/guide/config#挂载模式) |

---

## 参考

- WebUI：[WebUI 使用说明 · 隐藏页](/guide/webui#隐藏)
- 配置：[配置说明 · 临时挂载路径](/guide/config#临时挂载路径-tmpfs_style)
- 外部：[bindhosts](https://github.com/bindhosts/bindhosts)（hosts 重定向模块的隐藏思路，证书 bind 场景可类比 umount 需求）
