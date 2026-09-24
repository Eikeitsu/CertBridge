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
- 开启后：注入 / 热挂载成功会向 SuSFS、`ksud kernel umount`、NoHello 等登记
- 关闭时：立刻清登记（有 `ksud` 时对已知路径 `umount del`，**不** wipe 全表）
- 开关只同步写 conf 并立刻返回；登记在后台做，不堵 UI
- 验证卸载：对目标 App **强停再开**即可，不必仅为登记反复重启

无助手时：mountinfo 上的 bind 仍可能被检测发现。页面「SuSFS」表示**内核已集成 SuSFS**（读内核配置或 CLI 探活），不要求安装 susfs4ksu/ReSuFS；隐藏协助由本模块直接调用 `ksud kernel umount` / `ksu_susfs add_try_umount` 登记路径。

## Zygisk 挂载痕迹过滤

发布包可含 `zygisk/<abi>.so`。**默认安装不装**；自定义安装可选。勾选后 `zn_hide_allow` 默认开。

| 轨          | 技术                             | 作用范围                         | 发布包                     |
| ----------- | -------------------------------- | -------------------------------- | -------------------------- |
| **A（主）** | 经典 Zygisk API：`zygisk/*.so`   | 普通 App 进程内过滤 mount / maps | 有 so 时交付               |
| **B（辅）** | ZN Module：`zn_modules.txt` + so | init 拉起的服务进程              | **不打空壳**；校准前不打包 |

| 项目   | 说明                                                                 |
| ------ | -------------------------------------------------------------------- |
| 作用   | 过滤 mountinfo/mounts、maps/smaps；弱化 map_files readlink；流式按行 |
| 配置   | `zn_hide_allow`（与 `hide_allow` 独立）                              |
| 条件   | 设备已启用 Zygisk（内置或 ZygiskNext / ReZygisk / NeoZygisk 等）     |
| 白名单 | `config/zn_whitelist.txt`；默认含抓包 App；名单内不过滤              |
| 未安装 | 无 so → `zn_hide_supported=0`；隐藏页仅在有协助或 Zygisk 时出现      |

> so 仍在内存；PLT / Zygisk 底座本身仍可能被检测。过滤不是「隐身术」。

## 按 Root 方案

### KernelSU / SukiSU

1. 仅对需躲检测的 App 开 **「卸载模块」**
2. **不要**对 Reqable / ProxyPin / 被抓包目标开启
3. 有 SuSFS 时，`hide_allow=1` 会自动 `add_try_umount`
4. 需要进程内过滤 mountinfo 时，另装 Zygisk 过滤并启用兼容加载器

### Magisk

1. 用 **DenyList** / Shamiko / Zygisk umount 时，同样勿把抓包链路列入卸载
2. 可使用 **ZygiskNext / ReZygisk / NeoZygisk**（常需关内置 Zygisk）
3. **NoHello** / Zygisk Assistant：`hide_allow=1` 时可写 cacerts `point` 规则
4. Magisk **没有**官方 `ksud kernel umount` 等价物；脚本 bind 依赖上述助手或 Zygisk 过滤

### APatch

1. 仅对需躲检测的 App 开 **「排除修改」**
2. 勿对抓包链路开启
3. 可装 NeoZygisk / ReZygisk / ZygiskNext；或 NoHello 辅助

## WebUI「隐藏」页

| 区域     | 内容                                            |
| -------- | ----------------------------------------------- |
| 实况     | Root 方案、挂载模式、临时层、助手探测、登记状态 |
| 隐藏协助 | `hide_allow` 开关、立刻重登记                   |
| Zygisk   | `zn_hide_allow`、白名单编辑（已装组件时）       |
| 抓包清单 | 可关闭的提醒卡片                                |
| 冷门实验 | 强注 / 晚注入 / zygote / 多 APEX / service 探测 |

详见 [WebUI](/guide/webui) 与 [配置说明](/guide/config)。

## 能力对照

| 能力             | 入口                         | 要点                                 |
| ---------------- | ---------------------------- | ------------------------------------ |
| SuSFS / 内核卸载 | 安装组件 + `hide_allow`      | 对「卸载模块」名单内 App 卸挂载      |
| Zygisk 过滤      | 自定义安装 + `zn_hide_allow` | 过滤进程读到的本模块 mount / maps 行 |
| 临时层短路径     | `tmpfs_style`                | 减轻路径指纹，**不能**替代 umount    |
| 冷门实验         | 默认全关                     | 证书异常时再开兼容项                 |
