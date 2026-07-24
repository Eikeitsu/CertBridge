# 安装与升级

## 环境要求

- **Magisk** v20.4+ / **KernelSU**（含 SukiSU 等衍生） / **APatch**
- Android 7.0+（API 24+）；Android 14+ 走 APEX + system 双路径注入
- 建议使用支持模块 WebUI 的管理器（KernelSU 管理器、MMRL / WebUI-X 等）

## 下载哪个包？

| 包名 | 内容 | 适用 |
| --- | --- | --- |
| `CertBridge_v*.zip` | **完整版**：内置静态 OpenSSL（默认 arm + arm64；安装后再按设备 ABI 只留一份，约 7MB） | 推荐大多数用户；Recovery 刷入更稳 |
| `CertBridge_v*_lite.zip` | **Lite**：约 8KB `cbx509` dex，**无** OpenSSL | 体积敏感；依赖 `app_process`/`dalvikvm`。纯 Recovery 环境可能无法在安装阶段解析 App 证书，可重启后用 WebUI 导入 |

二者模块 ID 相同（`CertBridge`），不要同时安装；覆盖刷入即可切换。

在线更新（`updateJson`）默认指向完整版 zip。

## 安装步骤

1. 从 [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases) 下载最新 zip（完整版或 Lite）  
2. 在模块管理器中刷入  
3. 在 20 秒内用音量键选择：  
   - **音量上：默认安装（推荐）**——检测 Reqable / ProxyPin；ProxyPin 无 App 证时用内置兜底；安装 WebUI 与免重启热挂载  
   - **音量下：自定义安装**——依次选择 Reqable、ProxyPin、WebUI、免重启热挂载  
   - 若检测到 **HttpCanary**、**ADGuard**，会再依次询问是否导入为自定义  
   - 未检测到按键或超时 → 默认完整安装  
4. **重启**手机  
5. 若安装了 WebUI，打开页面确认状态与证书详情  

自定义安装中每个组件均需明确按音量上；音量下或超时会跳过该项。

补充行为：

- **Reqable**：未从 App 导入成功时，安装会关掉 Reqable 开关（模块不内置 Reqable 样例）  
- **ProxyPin**：无 App 证但安装时选了 ProxyPin → 使用内置兜底；App 与内置都没有 → 跳过并关掉开关  
- 安装日志：`data/install.log`（含 OpenSSL / Lite 探测与导入诊断）  

支持管理器在线更新：`module.prop` 的 `updateJson` 指向文档站 `update.json`。

![概览](/screenshots/webui-overview.png)

## 模块目录（设备上）

```text
/data/adb/modules/CertBridge/
├── module.prop
├── post-fs-data.sh
├── service.sh
├── action.sh
├── bin/                 # common / APEX 注入 / CLI
│   ├── openssl/         # 仅完整版：安装后按 ABI 精简
│   ├── cbx509/          # 仅 Lite：classes.dex
│   └── hot_mount.sh     # 可选热挂载
├── certs/
│   ├── builtin/         # 仅 ProxyPin 兜底
│   ├── sources/         # 从 App 导入的 Reqable / ProxyPin
│   ├── custom/          # 用户自定义
│   ├── generation/      # 本次启动生成的完整证书集
│   └── hot/             # 可选临时会话（卸载后删除）
├── config/certs.conf
├── config/install-profile.conf
├── data/install.log
└── webroot/             # 可选 WebUI
```

模块不在安装时抓取或长期保存系统 CA，也不创建会触发 Magic Mount 的 `system/cacerts` 目录。重启时读取实时信任库；至少 10 张且完整合并、校验成功后才挂载。任一步失败都保留系统原始信任库。

## 卸载

在模块管理器中卸载后必须重启。卸载脚本会尝试结束当前**临时热挂载**会话；**不会**主动拆除开机永久系统 CA 挂载（以免误伤其它证书模块叠加层），重启由内核统一清理。
