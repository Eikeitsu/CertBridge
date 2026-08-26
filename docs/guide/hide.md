# 挂载隐藏说明

证书桥通过 **bind mount** 将合并后的 CA 写入系统信任库路径。检测方仍可能从 `mountinfo`、路径特征或 trust store 内容发现异常。**换临时层路径不能替代 umount**；内核侧真正卸掉挂载依赖 SuSFS 等 try_umount；进程内读到的挂载表还可由本模块的 **Zygisk 挂载痕迹过滤** 去掉本模块相关行。

## 可选组件

### 挂载隐藏协助（SuSFS try_umount）

`bin/lib/hide_assist.sh` 随安装方案写入开关默认值：

| 安装方式   | 是否安装隐藏组件 | `hide_allow` 默认                         |
| ---------- | ---------------- | ----------------------------------------- |
| 默认安装   | **安装**         | **关闭**（`0`；可在 WebUI「隐藏」页开启） |
| 自定义安装 | 音量键可选       | 勾选后 **开启**（`1`；可在 WebUI 关闭）   |

未安装时（仅自定义安装跳过该项）：

- 设备上不保留 `hide_assist.sh`，不写 `data/state/hide-assist.conf`
- 若也未安装 Zygisk 过滤，WebUI **不显示「隐藏」页**

已安装时：

- WebUI 出现「隐藏」页，顶部有 **启用开关**（`hide_allow`）
- 开关打开时，注入 / 热挂载成功会向 SuSFS / 内核登记 `try_umount`
- 关闭开关会清除本模块记录的隐藏状态文件；内核侧登记通常需**重启**才清掉

### Zygisk 挂载痕迹过滤

发布包可含 `zygisk/<abi>.so`。自定义安装音量键可选；**默认安装不安装**。

本能力按双轨设计，与 SuSFS `hide_assist` 并行、互不替代：

| 轨 | 技术 | 作用范围 | 当前发布包 |
| -- | ---- | -------- | ---------- |
| **A（主）** | 经典 Zygisk API：`zygisk/<abi>.so` | 普通 App：过滤其读到的 mountinfo / mounts | **交付** |
| **B（辅）** | ZN Module：`zn_modules.txt` + 服务侧 so | 仅 init 拉起的服务进程同类过滤 | **不打空壳**；校准目标前不打包 |

| 项目       | 说明                                                                               |
| ---------- | ---------------------------------------------------------------------------------- |
| 作用（A）  | 过滤 mountinfo/mounts；并过滤 maps/smaps、弱化 map_files readlink，减轻对本模块 zygisk so 的路径扫描 |
| 配置       | `certs.conf` 的 `zn_hide_allow`（与 `hide_allow` 独立；A/B 共用）                  |
| 勾选后默认 | 自定义勾选时默认 **开启**（`1`）                                                   |
| 运行条件   | 设备需已启用 Zygisk（Magisk 内置或 ZygiskNext / ReZygisk / NeoZygisk 等）           |
| 白名单     | Reqable / ProxyPin 等抓包包名**不过滤**，避免读不到系统 CA                           |
| 未安装时   | 删除 `zygisk/` 与空/无效的 `zn_modules.txt`；无 so 时 `zn_hide_supported=0`         |

WebUI 隐藏页在安装了 SuSFS 协助和/或 Zygisk 过滤任一组件时出现，并分 Root 方案给出配置建议。

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

| 事实        | 说明                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| 路径迁移    | 默认临时层在 `/dev/.cb*` 是为避开对 `/data/local/tmp` 的关键词扫描，**不能**让 bind 消失 |
| 无助手时    | 没有 SuSFS / Zygisk umount 助手时，读 mountinfo 的检测仍可能发现 cacerts 上的 bind |
| Zygisk 过滤 | 可去掉 App 读到的本模块 mount / maps 行；so 仍在内存，PLT/行为与 Zygisk 底座仍可能被检出 |
| 注入方式    | 证书必须写入信任库路径才能被系统 TLS 使用；不存在无挂载的公共 CA 注入方案          |

---

## Magisk / Magisk Alpha / Kitsune

### 排除列表（DenyList）

在 Magisk App **「配置排除列表」** 勾选要对之隐藏 Root 的应用包名。这是 Magisk v24 起替代 **MagiskHide** 的机制，**不是**旧版 Hide。

### 强制执行排除列表（Enforce DenyList）

开启后主要对列表内 App **停用 Zygisk 模块注入**，**不等于**完整隐藏 bind mount。

与 **Shamiko** 常见用法冲突：使用 Shamiko 时通常应 **关闭 Enforce**，把目标 App 放进排除列表，由 Shamiko 处理挂载隐藏。

**不要**把 Reqable、ProxyPin 或正在抓包的目标 App 放进会触发 umount 的排除列表，否则会出现「根证书未安装」或抓包断网。详见上文 [抓包必读](#抓包必读不要对抓包链路开卸载模块)。

### Zygisk 助手模块

Magisk 可安装 **ZygiskNext**、**ReZygisk**、**NeoZygisk**（通常需关闭内置 Zygisk），它们同样能对目标进程 umount 模块挂载痕迹。本模块的 Zygisk 过滤 so 也由同一类加载器加载。

### 常见组合

- **Shamiko** + 排除列表（关闭 Enforce）
- **ZygiskNext / ReZygisk / NeoZygisk** 的 umount / 遵循排除列表
- **Zygisk Assistant / NoHello**（偏 bind mount 隐藏）
- 本模块可选 **Zygisk 挂载痕迹过滤** + SuSFS **try_umount**（可同时使用）

---

## KernelSU / SukiSU / 同类

1. 管理器内对需要躲检测的 App 开启 **「卸载模块」**（Umount modules）。
2. **不要**对 Reqable / ProxyPin / 被抓包目标开启卸载模块。
3. 若内核支持 **SuSFS**，本模块在 `hide_allow=1` 时会自动 `add_try_umount`。
4. 需要进程内过滤 mountinfo 时，额外安装本模块的 Zygisk 过滤组件，并保证已启用兼容的 Zygisk 加载器。

---

## APatch

1. **仅对需要躲检测的 App** 启用 **「排除修改（Exclude Modifications）」**。
2. **不要**对 Reqable / ProxyPin / 被抓包目标启用排除修改。
3. 建议安装 **NeoZygisk**、**ReZygisk** 或 **ZygiskNext**（umount only）。
4. 也可使用 **Zygisk Assistant / NoHello** 辅助隐藏 bind mount。

---

## 与本模块相关的配置

| 配置             | 位置                                                         | 说明                                                                     |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 临时层路径       | WebUI「更多 → 临时挂载路径」或 `certs.conf` 的 `tmpfs_style` | `dev`（默认）/ `short` / `legacy`；切换后需重启                          |
| SuSFS try_umount | 可选组件 + WebUI 开关                                        | 安装隐藏组件并开启 `hide_allow` 后，bind 成功由 `hide_assist.sh` 注册    |
| Zygisk 挂载过滤  | 可选组件 + WebUI 开关                                        | `zn_hide_allow`；主路径 `zygisk/*.so`；辅路径仅在有非空 `zn_modules.txt` 时 |
| 挂载模式         | WebUI「更多 → 挂载模式」                                     | 完整兼容 vs 轻量 Magic；见 [配置说明 · 挂载模式](/guide/config#挂载模式) |

---

## 相关文档

- WebUI：[WebUI 使用说明 · 隐藏页](/guide/webui#隐藏)
- 配置：[配置说明 · 临时挂载路径](/guide/config#临时挂载路径-tmpfs_style)
