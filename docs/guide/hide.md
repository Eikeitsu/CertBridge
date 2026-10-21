# 挂载隐藏

证书桥通过 **bind mount** 把合并后的 CA 挂到系统信任库路径。检测方仍可能从 `mountinfo`、路径特征或 trust store 内容发现异常。

- **换临时层路径 ≠ 隐藏**：只改 `tmpfs_style` 不能替代 umount
- **内核侧卸挂载**：依赖 SuSFS / `ksud` / NoHello 等 try_umount
- **进程内读表**：可选 Zygisk 过滤去掉本模块相关行

两套能力**并行、互不替代**。

## 抓包必读

证书要生效，进程必须能看到 cacerts 上的 **bind**。对某 App 开启「卸载模块 / Umount / DenyList+umount / 排除修改」后，该进程命名空间里证书层也会被卸掉。

| 对象                  | 若对其开启了 umount     | 常见表现                   |
| --------------------- | ----------------------- | -------------------------- |
| Reqable / ProxyPin 等 | 读不到系统库里的抓包 CA | 软件内「**根证书未安装**」 |
| 被抓包的目标 App      | TLS 看不到抓包 CA       | **断网**、证书错误         |

**正确做法**：只对需要躲检测、且**不参与本次抓包**的 App 开卸载模块；抓包软件与目标 App 一律关闭。

## 挂载隐藏协助（SuSFS / 内核）

| 安装方式   | 是否安装组件 | `hide_allow` 默认                     |
| ---------- | ------------ | ------------------------------------- |
| 默认安装   | **安装**     | **关**（`0`；可在 WebUI「隐藏」页开） |
| 自定义安装 | 音量键可选   | 勾选后 **开**（`1`；可在 WebUI 关）   |

未安装时：设备上不保留协助脚本；若也未装 Zygisk 过滤，WebUI **不显示「隐藏」页**。

已安装时：

- WebUI「隐藏」页有启用开关（`hide_allow`）
- 开启后：注入 / 热挂载成功会按本机**可用 CLI** 登记 umount（见下）
- 关闭时：立刻清登记（有 `ksud` 时对已知路径 `umount remove` / `del`，有 `umount save` 再落盘；**不** wipe 全表）
- 开关只同步写 conf 并立刻返回；登记在后台做，不堵 UI
- 验证卸载：对目标 App **强停再开**即可，不必仅为登记反复重启

无助手时：mountinfo 上的 bind 仍可能被检测发现。页面「隐藏助手」会并列展示本机可用的 SuSFS / ksud / NoHello / ZygiskNext 等（可同时生效，无互斥优先级）。

### umount 登记（能力探测）

KernelSU 系（含各下游）在 `hide_allow=1` 时大致按此顺序尝试，**子命令不存在则跳过**：

1. `ksud kernel notify-module-mounted`（上游要求：先通知再登记列表）
2. `ksud umount apply`（若管理器提供已落盘列表）
3. `ksud kernel umount add <path> --flags 0`（上游主路径。`2` = `MNT_DETACH`，当前内核对证书挂载会返回 -39，条目仍留在 mountinfo。路径已在名单里时先 `del` 再以 0 写入）
4. `ksud umount add …`（部分管理器顶层 CLI）
5. 可选 `umount-config add`、`umount save`、`feature save`
6. 若仍有 `ksu_susfs add_try_umount` 则一并调用

Magisk / APatch **无** ksud 路径 API：改写 NoHello `/data/adb/nohello/umount` 的 `point` 规则（需 ZygiskNext/ReZygisk 等，且 App 在排除/卸载列表内才真正 umount）。

还会按 `/proc/1/mountinfo` 实况补登当前 cacerts 叠层路径（含 `@版本`），避免只登符号路径漏一条。

SuSFS 探测**只认 CLI 与内核/LKM 对话**（不读版本文件、不解 `config.gz`）：优先 `ksud susfs version`，否则 `ksu_susfs show version`。隐藏页在探测成功时展示版本号。`hide_allow=0` 时不跑上述 CLI。

## Zygisk 挂载痕迹过滤 {#zygisk-挂载痕迹过滤}

发布包可含 `zygisk/<abi>.so`。**默认安装不装**；自定义安装可选。勾选后 `zn_hide_allow` 默认开。

| 轨          | 技术                             | 作用范围                          | 发布包                                           |
| ----------- | -------------------------------- | --------------------------------- | ------------------------------------------------ |
| **A（主）** | 经典 Zygisk API：`zygisk/*.so`   | 仅对 **过滤目标名单** 内 App 过滤 | 有 so 时交付                                     |
| **B（辅）** | ZN Module：`zn_modules.txt` + so | init 拉起的服务进程               | 仅当 `zn_modules.txt` 有活动行且 so 已构建时打入 |

开启后（且进程在目标名单中），进程读到的表里会去掉**指向本模块**的痕迹，例如：

- `mountinfo` / `mounts` 中含 `CertBridge`、`sys-ca-merge`、`/dev/.fs*`、`/mnt/.ca*` 等路径的行（擦字面量、**默认不删行**，避免挂载图断裂导致闪退/间隙误报）
- `maps` / `smaps` 中映射到本模块 `zygisk/*.so` 或上述临时层的行
- `readlink` 若解析到本模块路径，对外表现为不存在

**不卸挂载、不改信任库内容**：cacerts bind 仍在，HTTPS 仍可用本模块 CA。与 Root「卸载模块」互补——后者才真正从命名空间拆掉叠层。

> **默认安装不含 Zygisk 过滤。** 默认安装下藏 cacerts 挂载只能靠 `hide_allow` + 管理器对该 App 开「卸载模块」（真 umount）。Zygisk 过滤需自定义安装勾选。

| 项目     | 说明                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 配置     | `zn_hide_allow`；`zn_filter_mode`；挂钩目标默认藏匿名跳板（`zn_hide_anon_exec=0` 关）                                                               |
| 名单模式 | **黑名单（默认）**：`zn_blacklist.txt` 内才过滤，空=不过滤。**白名单**：`zn_whitelist.txt` 内不过滤，空≈全机过滤（慎用）。抓包 App 两模式均永久豁免 |
| 未安装   | 无 so → `zn_hide_supported=0`                                                                                                                       |

> **黑名单命中**：装 PLT + 过滤 mount/maps；默认从 maps 藏 `[anonymous]` 跳板页（Duck Memory 主因；无名大页仍有体量限制）；挂载表擦路径不删行；hooks 失败 fail-open；readlink 改写良性路径。`zn_hide_anon_exec=0` 可关藏跳板。未命中 `DLCLOSE`。改名单后请强停。  
> **过滤 ≠ 卸载模块**：前者保 CA，后者拆挂载。仅卸载模块仍报的 mount-ID/一致性，多半是 Root/KSU 叠层本身。

### 路径指纹（配合过滤）

脚本注入把证书拷到短路径 tmpfs（默认 `/dev/.fs0`）再 bind，并在成功后拆除 staging 挂载点，减少 mountinfo 长期暴露模块树。若仍看到 `modules/CertBridge`，多为 **Magic Mount** 叠层——可改用 `mount_mode=compatible` + `tmpfs_style=dev`，再按黑名单写入需过滤的包名。

## 按 Root 方案

### KernelSU / SukiSU / BakaSU / KSU-Next

1. 仅对需躲检测的 App 开 **「卸载模块」**，并确保管理器里 **内核级卸载 / kernel_umount** 为开
2. **不要**对 Reqable / ProxyPin / 被抓包目标开启
3. `hide_allow=1`：按上一节能力探测自动登记 cacerts 路径
4. 需要进程内过滤 mountinfo 时，另装 Zygisk 过滤并启用兼容加载器，再把包名写入过滤目标
5. 软重启后挂载异常时，优先用**冷重启**做基线验证

### Magisk

1. 用 **DenyList** / Shamiko / Zygisk umount 时，同样勿把抓包链路列入卸载
2. 可使用 **ZygiskNext / ReZygisk / NeoZygisk**（常需关内置 Zygisk；Enforce DenyList 建议关）
3. **NoHello**：`hide_allow=1` 时写 cacerts `point` 规则，并放置 `umount_persist` 标记
4. Magisk **没有**官方路径级 umount API；脚本 bind 依赖 NoHello / Zygisk 过滤，不能指望仅 DenyList

### APatch

1. 仅对需躲检测的 App 开 **「排除修改」**
2. 勿对抓包链路开启
3. 装 NeoZygisk / ReZygisk / ZygiskNext + **NoHello**；`hide_allow` 登记 point，由排除名单决定是否 umount

## WebUI「隐藏」页

| 区域     | 内容                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 实况     | Root 方案、挂载模式、临时层、助手探测、登记状态                         |
| 隐藏协助 | `hide_allow` 开关、立刻重登记                                           |
| Zygisk   | `zn_hide_allow`、黑白名单模式；可「勾选应用」快捷写入名单（已装组件时） |
| 说明     | 「过滤 ≠ 卸载模块」提示                                                 |
| 抓包清单 | 可关闭的提醒卡片                                                        |
| 冷门实验 | 强注 / 晚注入 / zygote / 多 APEX / service 探测                         |

详见 [WebUI](/guide/webui) 与 [配置说明](/guide/config)。

## 能力对照

| 能力             | 入口                                                        | 要点                              |
| ---------------- | ----------------------------------------------------------- | --------------------------------- |
| SuSFS / 内核卸载 | 安装组件 + `hide_allow`                                     | 对「卸载模块」名单内 App 卸挂载   |
| Zygisk 过滤      | 自定义安装 + `zn_hide_allow` + `zn_filter_mode` + 黑/白名单 | 按模式过滤本模块 mount / maps 行  |
| 临时层短路径     | `tmpfs_style`                                               | 减轻路径指纹，**不能**替代 umount |
| 冷门实验         | 默认全关                                                    | 证书异常时再开兼容项              |
