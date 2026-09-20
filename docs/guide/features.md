# 功能介绍

**证书桥**（仓库 CertBridge，模块 id `CertBridge`）运行在 Magisk / KernelSU / APatch 上：真正干活的是开机脚本与可选组件；WebUI / CLI 只是配置与观察入口。

**下载**：[GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases)（`*_arm64.zip` / `*_arm.zip` / `*_x86.zip` / `*_x64.zip` / `*_lite.zip`）→ [安装说明](/guide/install)

## 产品组成

| 组件                 | 说明                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| Magisk 模块          | `post-fs-data` / `service`：合并 CA、bind 信任库、可选晚注入         |
| WebUI（可选）        | 管理器内：首页 / 证书 / 日志 / 隐藏 / 更多                           |
| 免重启热挂载（可选） | 用户凭据区或存储卡证书临时注入；重启后消失                           |
| 挂载隐藏协助（可选） | SuSFS / `ksud` / NoHello 登记 try_umount；默认安装会装、开关默认关   |
| Zygisk 过滤（可选）  | 进程内过滤 mountinfo / maps 中本模块行；**默认安装不安**，自定义可选 |
| CLI                  | 模块内 `bin/cb` → `cert_manager.sh`（`help` / `status` / `set` …）   |

## 核心：系统 CA 注入

每次开机大致流程：

1. 从未被本模块挂载的实时 system / Conscrypt APEX 信任库读取完整 `hash.N` 集合
2. 加入已启用的 Reqable / ProxyPin / 自定义等 addon
3. 校验通过后，把**整份**证书集 bind 到信任库路径（完整兼容模式）

模块**不保存**系统 CA 基线，也**不修改**系统分区文件。实时源过少、复制不完整或 addon 校验失败时**放弃本次注入**，系统原库不变。

## 证书来源

| 来源                    | 行为                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| Reqable                 | 从已安装 App 读取（**不内置**样例）；可开关；开机 / 刷新可再同步 |
| ProxyPin                | 优先 App；未检测到且安装时启用了 ProxyPin → 模块内置兜底；可开关 |
| HttpCanary / ADGuard    | 安装时可能询问导入为**自定义**；刷新时也可探测                   |
| 自定义                  | WebUI 上传 PEM / DER，或放入 `certs/custom/`；显示名取自证书主题 |
| 用户区 / 存储卡（临时） | 需热挂载组件；见 [配置说明 · 热挂载](/guide/config#热挂载)       |

## 挂载模式

| 模式                      | 说明                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| **完整兼容** `compatible` | 默认。运行时整库合并 + bind；**不依赖** Magic Mount 元模块          |
| **轻量 Magic** `magic`    | 仅叠 addon 到 `system/`；Magisk 一般自带；KernelSU 常需确认叠层正确 |

Android 14+：默认 `experimental_14_system=skip`，优先脚本 bind **主 APEX**，跳过 system（痕迹更少）。详情见 [配置说明](/guide/config#挂载模式)。

## 挂载隐藏（摘要）

检测方可能从 `mountinfo`、路径或 trust store 内容发现异常。模块提供两套**互不替代**的可选能力：

| 能力                | 作用                                            | 默认安装       |
| ------------------- | ----------------------------------------------- | -------------- |
| SuSFS / 内核 umount | 登记后，对开启「卸载模块」的 App 卸掉本模块挂载 | 装组件、开关关 |
| Zygisk 挂载过滤     | 在目标进程内过滤读到的 mount / maps 本模块行    | 不安装         |

**抓包链路不要开卸载模块**，否则会出现「根证书未安装」或断网。完整说明见 [挂载隐藏](/guide/hide)。

## 冷门实验（默认痕迹最少）

默认均为关闭 / 跳过，证书异常时再在 WebUI「隐藏 → 冷门实验」打开：

| 键                   | 默认关时的含义                                        |
| -------------------- | ----------------------------------------------------- |
| `late_inject`        | 仅 boot 注入，service 不再补命名空间                  |
| `boot_bind_zygote`   | 开机只 bind init，不 nsenter zygote                   |
| `boot_multi_apex`    | 14+ 只绑主 APEX（跳过 `@版本` 与 system）             |
| `service_probe`      | 不退避校验 / 延迟 heal（仅 `late_inject=1` 时有意义） |
| `force_bind_capture` | 尊重「卸载模块」，不强注 Reqable/ProxyPin             |

## 界面入口

- [WebUI 使用说明](/guide/webui)
- [命令行 CLI](/guide/cli)
- [挂载隐藏](/guide/hide)

## 适用场景

| 场景                        | 建议                               |
| --------------------------- | ---------------------------------- |
| Reqable / ProxyPin 系统抓包 | 默认安装 + 重启；确认指纹一致      |
| Android 14+ APEX 信任库     | 完整兼容即可；缺证再开冷门实验     |
| 想躲 mount 检测             | 装隐藏协助并开启；可选 Zygisk 过滤 |
| 只要体积小                  | 刷 Lite 包（无 OpenSSL）           |
| 临时试用用户区 CA           | 热挂载；永久请用自定义导入         |

## 不做什么

- 不提供抓包代理本身（请用 Reqable、ProxyPin 等）
- **不修改** SELinux 策略文件（仅对临时证书目录 `chcon`）
- 不把用户凭据区证书永久「搬家」进模块
- 不内置 Reqable 样例证书

## 路径速查

```text
/data/adb/modules/CertBridge/
/data/adb/modules/CertBridge/config/certs.conf
/data/adb/modules/CertBridge/config/zn_whitelist.txt   # 装了 Zygisk 过滤时
/data/adb/modules/CertBridge/bin/cb
/data/adb/modules/CertBridge/data/install.log
/data/adb/certbridge/                                  # 热更新等外部短时文件
```
