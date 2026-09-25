# 配置说明

推荐用 **WebUI** 修改。也可用 `bin/cb set` / `cb get`，或直接编辑文件。

| 文件                          | 内容                                       |
| ----------------------------- | ------------------------------------------ |
| `config/certs.conf`           | 证书开关、挂载模式、热挂载、隐藏与冷门实验 |
| `config/zn_whitelist.txt`     | Zygisk 过滤白名单（一行一个包名）          |
| `config/install-profile.conf` | 安装时写入的组件档案（只读状态）           |
| `data/state/`                 | 运行态缓存、隐藏协助状态等                 |

路径前缀：`/data/adb/modules/CertBridge/`。

## `certs.conf` 常用项

```text
schema_version=4
reqable=1
proxypin=1
mount_mode=compatible
experimental_14_system=skip
tmpfs_style=dev
quiet_prop=0
hot_allow=1
force_bind_capture=0
late_inject=0
boot_bind_zygote=0
boot_multi_apex=0
service_probe=0
```

安装了对应组件后，还可能出现：

| 键              | 含义                                  |
| --------------- | ------------------------------------- |
| `hide_allow`    | `1`=开启 SuSFS / 内核 try_umount 登记 |
| `zn_hide_allow` | `1`=开启 Zygisk 挂载过滤              |

### 证书开关

| 键         | 默认 | 含义                               |
| ---------- | ---- | ---------------------------------- |
| `reqable`  | `1`  | 启用从 App 导入的 Reqable CA       |
| `proxypin` | `1`  | 启用 ProxyPin CA（App 或内置兜底） |

改开关后一般需**重启**（或热挂载场景下按界面提示）才完整生效。

### 挂载模式 {#挂载模式}

可在自定义安装或 WebUI「更多 → 挂载模式」切换，**重启**后生效。默认安装固定完整兼容。

|                           | Android 7–13                           | Android 14+（默认 `experimental_14_system=skip`）      |
| ------------------------- | -------------------------------------- | ------------------------------------------------------ |
| **完整兼容** `compatible` | 脚本整库 bind system cacerts           | 脚本 bind **APEX**；默认**跳过** system                |
| **轻量 Magic** `magic`    | 仅 Magic Mount 叠 addon（无脚本 bind） | 脚本 bind **APEX**；默认跳过 system；`auto` 时叠 addon |

#### 完整兼容（默认）

- 开机完整合并系统库 + addon → tmpfs → `bind` 到目标路径
- 模块 `system/` **不写**叠层目录（避免空目录遮蔽整库）
- **不需要** Magic Mount 元模块

#### 轻量 Magic

- 只把启用的 addon 写成 `hash.N` 放进模块 `system/etc/security/cacerts/`
- **Magisk** 一般自带文件级叠层即可
- **KernelSU** 常需确认叠层正确；若整目录替换导致只剩几张 CA、大面积 TLS 失败 → 立刻改回完整兼容并重启

#### Magic Mount 元模块 {#magic-mount-meta}

「元模块」指管理器侧负责把模块 `system/` 叠进真实系统路径的那一层（Magisk 内置、KernelSU/APatch 各有实现或需额外模块）。与「隐藏助手」（SuSFS / ZygiskNext 等）不是一回事。

| Root     | 完整兼容                | 轻量 Magic                                        |
| -------- | ----------------------- | ------------------------------------------------- |
| Magisk   | 脚本 bind，不依赖元模块 | 通常用内置叠层即可，一般不必另装元模块            |
| KernelSU | 脚本 bind，不依赖元模块 | 依赖内核/管理器 Magic Mount；整目录替换会伤系统库 |
| APatch   | 脚本 bind，不依赖元模块 | 依赖管理器叠层；异常时改回完整兼容                |

WebUI「更多 → 挂载与注入」挂载模式下方也有同样摘要。隐藏相关说明见 [挂载隐藏](/guide/hide)。

#### `experimental_14_system`

仅 Android 14+ 生效：

| 值     | 含义                                                          |
| ------ | ------------------------------------------------------------- |
| `skip` | 默认：不处理 system，只脚本 bind APEX                         |
| `auto` | 再按 `mount_mode` 处理 system（compatible=bind / magic=叠层） |

与 `boot_multi_apex=0`（默认）配合：14+ 只绑**主** APEX，跳过 `@版本` 与 system，痕迹更少。设 `boot_multi_apex=1` 时走完整目标列表（仍尊重双模式与本键）。

### 临时层路径 `tmpfs_style`

| 值       | 路径示意                  |
| -------- | ------------------------- |
| `dev`    | `/dev/.fs*`（默认）       |
| `mnt`    | `/mnt/.ca*`               |
| `short`  | `local/tmp` 下短名        |
| `legacy` | 历史 `sys-ca-merge*` 风格 |

换路径**不能替代** umount 隐藏；见 [挂载隐藏](/guide/hide)。

### 其它行为

| 键                   | 默认 | 含义                                                          |
| -------------------- | ---- | ------------------------------------------------------------- |
| `quiet_prop`         | `0`  | `0`=管理器列表写入运行状态标签（默认）；`1`=保持中性简介      |
| `hot_allow`          | `1`  | 允许 WebUI / Action 发起临时热挂载（需已装组件）              |
| `force_bind_capture` | `0`  | `1`=命名空间强注 Reqable/ProxyPin；默认尊重「卸载模块」       |
| `late_inject`        | `0`  | `1`=`boot_completed` 后再补应用命名空间（兼容难机，痕迹更多） |
| `boot_bind_zygote`   | `0`  | `1`=开机 nsenter zygote；默认只 bind init                     |
| `boot_multi_apex`    | `0`  | `1`=完整双模式目标；默认 14+ 仅主 APEX                        |
| `service_probe`      | `0`  | 仅 `late_inject=1`：`1`=退避校验+延迟 heal                    |

冷门实验入口：WebUI **隐藏 → 冷门实验**。

## 热挂载 {#热挂载}

需安装热挂载组件且 `hot_allow=1`。

| 类型     | 说明                                                |
| -------- | --------------------------------------------------- |
| 用户区   | 读取用户凭据区 CA，免重启注入系统信任库             |
| 存储卡   | 扫描目录（常用文档下 `cacerts`）；可用 CLI 指定路径 |
| 无痕卸载 | 只撤销本次临时会话，不改永久配置                    |

临时层会合并当前已启用的永久 addon，避免盖掉 Reqable / ProxyPin。重启后临时会话消失。CLI：`cb hot_mount` / `cb hot_unmount`。

## Zygisk 白名单

路径：`config/zn_whitelist.txt`。一行一个包名（可含 `:进程` 前缀匹配）；`#` 开头为注释。默认含 Reqable / ProxyPin 相关包名，名单内**不过滤** mount/maps，避免抓包 App 读不到系统 CA。

WebUI「隐藏」页可编辑；保存后需**强停相关 App** 或重启生效。CLI：`cb get_zn_whitelist` / `cb set_zn_whitelist`。

## 相关文档

- [挂载隐藏](/guide/hide) — SuSFS / Zygisk / 分 Root 方案
- [命令行 CLI](/guide/cli) — `cb set` / `cb status`
- [常见问题](/guide/faq)
