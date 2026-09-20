# 常见问题

按场景查阅。改配置请用 WebUI 或 [CLI](/guide/cli)；键名见 [配置说明](/guide/config)。

## 安装与更新

### 模块从哪里下载？

**[GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases)**。选 `*_arm64.zip`（推荐）或 `*_arm.zip` / `*_x86.zip` / `*_x64.zip` / `*_lite.zip`。文档站是说明书，不托管安装包；顶部导航「下载」也指向同一地址。

### 刷完没反应 / 证书还是错的？

1. **重启**一次
2. WebUI 首页确认大状态为「运行正常」（不是异常 / 检测中）
3. **强停**被抓包 App 以及 Reqable / ProxyPin 再打开
4. 点「刷新复核」，或执行：

   ```bash
   /data/adb/modules/CertBridge/bin/cb status --live
   ```

5. 仍失败：看日志里 `inject:` / `generation:`，或 Action / 首页诊断建议

### WebUI 打不开？

安装时要勾选 WebUI（默认安装已含），且管理器要支持模块网页。普通浏览器不行。可重刷同版本并选择安装 WebUI。

### 没有「隐藏」页？

未安装挂载隐藏协助，也未安装 Zygisk 过滤。默认安装**会装**隐藏协助；若自定义时两项都跳过，则无此页。重刷并勾选即可。

### 没有 Zygisk 过滤选项 / 提示缺 so？

默认安装不安该组件；自定义安装才会问。若包内未带 `zygisk/*.so`，勾选后会提示缺失——请用带 so 的正式包，或自行构建。

### 更新后设置变了？

同模块覆盖升级会尽量保留 `certs.conf` 与自定义证书；安装时音量键仍会再问组件。WebUI「更多」可切换正式 / CI 更新通道。

---

## 抓包与证书

### Reqable 显示「根证书未安装」，或一开抓包就断网？ {#root-cert-missing}

优先查 **Root 隐藏是否卸掉了证书挂载**：

| 现象                    | 常见原因                                          |
| ----------------------- | ------------------------------------------------- |
| 抓包软件提示根证未安装  | 对该软件开了卸载模块 / DenyList umount / 排除修改 |
| 目标 App 断网、证书错误 | 对**目标 App** 开了 umount                        |

处理：对 Reqable / ProxyPin **以及**被抓包目标，关闭卸载模块；仅对不参与抓包的 App 开启。详见 [挂载隐藏](/guide/hide)。

### 状态正常，抓包还是断网？

**很常见：App 正在用的根证，和模块里启用的不是同一张。**

1. Reqable 重新生成证书后模块需再同步（不内置样例）
2. ProxyPin 以 App 当前证为准；指纹对不上就不算同一张
3. 「用户证书」≠「系统证书」；本模块注入的是系统 / APEX 信任库
4. 对照 WebUI 证书详情里的指纹与 App 内显示

处理：刷新复核 / `cb sync_apps`；或自定义导入后**重启**；临时可用热挂载。

### 系统 CA 已生效，个别 App（如抖音）仍断网？ {#cert-pinning}

证书桥只把抓包 CA 写入 **Android 系统信任库**（system / Conscrypt APEX）。部分 App **不会**完全依赖系统信任锚，例如：

- **证书锁定（Certificate Pinning）**：仅接受预置公钥 / 证书指纹，拒绝「系统信任但未锁定」的中间人证书
- **自建信任库 / 自定义 SSL 栈**：内嵌自有 CA 列表或 OkHttp / 自研 TLS，绕过系统 `TrustManager`
- 其它加固或网络安全配置（如仅信任用户区、禁用系统用户 CA 等）

此时即使用户侧 TLS 中间人已正确部署，目标 App 仍可能握手失败并表现为**断网**——这属于应用层信任策略，**不是**系统 CA 未注入。

**如何判断是否仍是证书桥的问题：**

1. 打开 Reqable（或同类工具）的**证书管理**：若根证书状态为绿色 **「已安装」**（系统信任库侧已识别抓包 CA）
2. 且证书桥 WebUI / `cb status --live` 为大状态正常、指纹与抓包软件一致

则系统 CA 注入链路已成立，断网应优先排查该 App 的 pinning / 私有信任策略，而不是反复重装本模块。

**可行方向（与证书桥无关）：** 使用针对 pinning 或 SSL 校验的 **Xposed / LSPosed 模块**（或抓包软件自带的对应方案），在目标进程内放宽校验。具体模块因 App 与版本而异，需自行评估风险与合规性。

### 白名单为空能抓、只抓单个 App 却断网？ {#whitelist-disconnect}

多数与证书桥无关，是抓包软件的**拦截范围 / 单应用 VPN / DNS** 问题。可先对「全部应用」试抓；仍断网再查证书指纹与 umount。

### 刚重启显示异常，过一会又正常？

开机瞬间命名空间可能未就绪。较新版本会退避重试与延迟自愈；点一次「刷新复核」即可。若你关闭了 `late_inject` / `service_probe`（默认关），中间态会更短、兼容性依赖机型——证书异常时再开冷门实验。

---

## 挂载与机型

### 大面积 HTTPS 失败、系统 CA 像只剩几张？

轻量 Magic 模式下，若 KernelSU 等把模块 `system/` **整目录替换**，会遮蔽原系统 CA。立刻改回 **完整兼容** 并重启。见 [配置说明 · 挂载模式](/guide/config#挂载模式)。

### Android 14+ 部分 App 仍不信任？

默认只绑主 APEX 且跳过 system（痕迹最少）。可依次尝试（均需重启）：

1. `experimental_14_system=auto`
2. `boot_multi_apex=1`
3. `boot_bind_zygote=1` / `late_inject=1`

入口：WebUI「隐藏 → 冷门实验」或 `cb set …`。

### 和别的证书 / 挂载模块一起用？

尽量避免多个模块同时改同一 cacerts。卸载其它证书模块后重启再测。热挂载若检测到上层叠层会拒绝强拆并提示重启。

---

## 界面与配置

### 命令行怎么用？

```bash
/data/adb/modules/CertBridge/bin/cb help
```

常用：`status --live`、`set`、`sync_apps`、`hot_mount`。完整说明见 [命令行 CLI](/guide/cli)。

### 热挂载后重启又没了？

预期行为：临时会话不持久。永久请用自定义证书或保持 Reqable/ProxyPin 开关开启并重启。

### 相关抓包软件？

见 [相关软件](/guide/related)（Reqable / ProxyPin / HttpCanary / ADGuard 等）。
