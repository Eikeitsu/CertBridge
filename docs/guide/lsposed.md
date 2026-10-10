# LSPosed 模块

证书桥只把 CA 写进 **系统信任库**。若 Reqable 等已显示根证「已安装」、本模块状态也正常，但**个别 App 仍断网**，多半是该 App 做了 **证书锁定（pinning）** 或自建 TLS——需在目标进程内用 Hook 放宽校验。

以下为社区常用选项，**非证书桥依赖**，请自行评估风险与合规性；作用域只勾需要抓包的 App，勾完强停目标进程。抓包软件本身见 [相关软件](/guide/related)。

## 框架

先装框架（按机型与 Root 方案选其一即可）：

| 框架                                | 说明                                 | 仓库 / 下载                                                                                                                                              |
| ----------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LSPosed（官方）**                 | Zygisk 版 Xposed，仍在维护           | 官网 [lsposed.org](https://lsposed.org) · 短链最新版 [lsposed.zip](https://lsposed.zip) · [GitHub Releases](https://github.com/LSPosed/LSPosed/releases) |
| **JingMatrix / Vector**（可选分支） | 社区 fork，部分新系统 / 机型跟进更快 | [JingMatrix/LSPosed](https://github.com/JingMatrix/LSPosed) · [Releases](https://github.com/JingMatrix/LSPosed/releases)                                 |
| **模块仓库**                        | 管理器内浏览 / 安装部分模块          | [LSPosed 模块仓库](https://modules.lsposed.org/)                                                                                                         |

稳定版以官方 [Releases](https://github.com/LSPosed/LSPosed/releases) 或 **lsposed.zip** 为准；需要预览构建时可看 GitHub Actions。Magisk / 兼容管理器请**开启 Zygisk**，安装 `*-zygisk-*.zip`；基于 **Riru** 的旧包已淘汰，新装勿再选 `*-riru-*.zip`。

## SSL / 证书锁定绕过

解决场景见 [FAQ · 系统 CA 已生效个别 App 仍断网](/guide/faq#cert-pinning)。不同 App / 加固方式对模块兼容不一，可换模块或收窄作用域试。

| 模块                       | 作用简述                                                          | 仓库                                                                                                      | 下载                                                                     |
| -------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **JustTrustMe**            | 经典 Xposed：禁用常见 SSL 校验 / pinning（偏旧，部分新 App 无效） | [Fuzion24/JustTrustMe](https://github.com/Fuzion24/JustTrustMe)                                           | [Releases](https://github.com/Fuzion24/JustTrustMe/releases)             |
| **TrustMeAlready**         | 全局放宽 SSL 校验；原仓库已归档                                   | [ViRb3/TrustMeAlready](https://github.com/ViRb3/TrustMeAlready)（归档）                                   | [Releases v1.11](https://github.com/ViRb3/TrustMeAlready/releases)       |
| **TrustMeAlready（fork）** | 2024 社区 fork，仍基于原项目思路                                  | [mobile46/TrustMeAlready](https://github.com/mobile46/TrustMeAlready)                                     | [Releases v1.0](https://github.com/mobile46/TrustMeAlready/releases)     |
| **TrustMe**                | 较新的综合 unpin，带 Compose 设置与分 Hook 开关                   | [kirklin/TrustMe](https://github.com/kirklin/TrustMe)                                                     | 见仓库 Releases / 自行构建                                               |
| **SSLBypass**              | LSPosed 模块：绕过多种 SSL 校验 / pinning（2025 起在模块仓更新）  | [errorman-awful/SSLBypass](https://github.com/errorman-awful/SSLBypass) · 包名 `com.winnersonx.sslbypass` | [模块仓页](https://modules.lsposed.org/module/com.winnersonx.sslbypass/) |
| **SSL Kill Switch（LSP）** | Java 层 + 部分 Flutter / 原生路径的 pinning 绕过                  | [0xdad0/ssl-kill-switch-lsposed](https://github.com/0xdad0/ssl-kill-switch-lsposed)                       | 见仓库 Releases / 说明                                                   |
| **SSLUnpinner**            | 标准 Android SSL API + Flutter `libflutter` 运行时补丁            | [AhmedZero/SSLUnpinner](https://github.com/AhmedZero/SSLUnpinner)                                         | 见仓库 Releases / 说明                                                   |

### 使用提示

1. LSPosed 中启用模块 → 作用域勾选**被抓包的目标 App**（一般**不要**勾系统框架，除非模块文档要求）。
2. 强停目标 App 后再开抓包；仍失败可换上表另一模块，或查抓包软件是否自带「绕过 SSL / pinning」开关。
3. 与证书桥并行时：先保证系统 CA / 指纹正确，再开 unpin；不要指望 unpin 模块代替本模块注入系统信任库。

## 分身 / 多开与 VPN 抓包 {#clone-vpn}

**证书桥不能代管 VPN 或代理路由**——它只改系统 CA，不会让抓包软件的 `VpnService` / TUN 自动套用到所有用户或分身实例。

常见现象（尤其 **ColorOS / OPPO 应用分身**、部分 **系统分身**）：

- 主空间 App 能走抓包 VPN，**分身里的同一 App 流量不进隧道**；
- 或抓包工具开「单 App VPN / 白名单」时，只勾分身实例仍断网。

可先尝试（与证书桥无关）：

1. 抓包软件改为 **拦截全部应用** 或 **Wi‑Fi 代理 + 系统 CA**（不依赖单 App VPN）；
2. 在**分身空间内单独安装**抓包 App 并授予 VPN，避免主 / 分身各装一个 VPN 客户端抢 `VpnService`；
3. 不要对 VPN / 抓包 App 再开「应用分身」。

若必须是 ColorOS 分身 + VPN 抓包，社区有 **LSPosed 补丁类模块**（Hook 系统侧，使 VPN 能接管分身流量），例如：

| 模块                | 作用简述                                 | 仓库                                                                      |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| **Coloros VPN fix** | 修复 ColorOS 上 VPN 无法接管**应用分身** | [fengxi555/Coloros-VPN-fix](https://github.com/fengxi555/Coloros-VPN-fix) |

按该模块 README 启用作用域并重启后再测；固件版本差异大，不保证所有 ColorOS 版本有效。

若问题是 App **检测到 VPN 后拒绝联网**（而非流量没进隧道），见下节；二者不要混用同一套模块逻辑。

### App 检测「正在使用 VPN」

与「分身不进 VPN」不同：这里是目标 App 读取 `NetworkCapabilities` / `tun0` 等后主动断网。可选社区模块（**非证书桥功能**）：

| 模块                       | 说明                                                                                     | 仓库 / 下载                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **NoVPNDetect**            | 经典：在目标 App 进程内隐藏 VPN 状态                                                     | [模块仓](https://modules.lsposed.org/module/me.hoshino.novpndetect/) · [Bitbucket](https://bitbucket.org/yuri-project/novpndetect) |
| **NoVPNDetect Enhanced**   | 覆盖更多 Java / 部分 native API，带调试日志                                              | [BlueCat300/NoVPNDetectEnhanced](https://github.com/BlueCat300/NoVPNDetectEnhanced)                                                |
| **VPN Hide**               | Hook `system_server`，对选定 UID 隐藏 VPN（可配合内核模块藏 `tun`）；反注入 App 相对友好 | [okhsunrog/vpnhide](https://github.com/okhsunrog/vpnhide)                                                                          |
| **HandsOffMyVPN**          | 目标 App 内 Hook 常见 VPN 检测 API                                                       | [thelok1s/hands-off-my-vpn](https://github.com/thelok1s/hands-off-my-vpn)                                                          |
| **OplusNoVpnNotification** | 仅去掉 ColorOS / OxygenOS「VPN 已连接」通知（**不**解决分身路由或 App 检测）             | [libxzr/OplusNoVpnNotification](https://github.com/libxzr/OplusNoVpnNotification)                                                  |

有 LSPosed 内存注入检测的 App 可能对进程内 Hook 模块失效；可优先试 **VPN Hide** 的「只勾系统框架 + 目标列表在 App 内配置」方案。

## 会员类模块里的同类拓展 {#vip-ext}

社区还有一批以**解锁会员 / 解除功能限制**为主的 LSPosed 模块（如 Fuck for VIP、HookVip / NewHookVip）。它们与上表专用 SSL / VPN 模块定位不同，但模块内常带「**拓展**」能力，其中不少与本文前述场景**同类**，例如：

- 绕过 / 放宽 SSL 证书校验（如 HookVip 拓展里的 JustTrustMe++）；
- 隐藏 VPN 检测、藏 Root / Xposed、解除截屏限制等通用 Hook。

抓包遇 pinning 或「检测到 VPN 就断网」时，若已安装这类模块，可先在其**拓展**页按目标 App 打开对应开关试一下；仍建议优先用上文专用模块，效果更可预期。**非证书桥依赖**，请自行评估风险与合规性；作用域与适配版本以各模块说明为准。

| 模块                       | 作用简述                                                                    | 仓库 / 下载                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fuck for VIP**（fckvip） | 解锁部分软件会员；拓展含去 VPN 检测、藏 Root/Xposed、控件拦截等（见模块内） | [bug-bit/fckvip](https://github.com/bug-bit/fckvip) · 包名 `com.bug.hookvip` · [模块仓](https://modules.lsposed.org/module/com.bug.hookvip/)                  |
| **NewHookVip**（HookVip）  | 解锁会员 / 高级功能；拓展含 JustTrustMe++（SSL 绕过）等（见模块内）         | [Xposed-Modules-Repo/top.hookvip.pro](https://github.com/Xposed-Modules-Repo/top.hookvip.pro) · [模块仓](https://modules.lsposed.org/module/top.hookvip.pro/) |

同类「会员 + 拓展」模块还有不少分支 / 仿品，下载请认准作者渠道；与证书桥无集成关系。

## 勿与 SSL 绕过混淆

| 模块             | 实际用途                                                                                | 仓库                                                          | 下载                                                        |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| **Tricky Store** | 改写 Keystore / 认证证书链（Play Integrity、设备证明等），**不是** HTTP(S) pinning 绕过 | [5ec1cff/TrickyStore](https://github.com/5ec1cff/TrickyStore) | [Releases](https://github.com/5ec1cff/TrickyStore/releases) |

Tricky Store 解决的是「应用校验设备密钥 / 完整性」类问题；系统 CA 未注入或 pinning 导致的抓包断网，应优先用证书桥 + 上表 SSL 模块，而不是 Tricky Store。
