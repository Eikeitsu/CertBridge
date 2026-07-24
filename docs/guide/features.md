# 功能介绍

## 做什么

证书桥（CertBridge）把抓包 CA **合并进** Android **系统信任库**。每次开机都会：

1. 从未被本模块挂载的实时 system / Conscrypt APEX 信任库读取完整 `hash.N` 证书集  
2. 加入本模块启用的 Reqable / ProxyPin / 自定义等附加证书  
3. 校验通过后，把**整份**证书集 bind 到信任库路径  

模块**不保存**系统 CA 基线，也**不修改**系统分区文件。

## WebUI 预览

|                   概览                   |                 证书                  |
| :--------------------------------------: | :-----------------------------------: |
| ![概览](/screenshots/webui-overview.png) | ![证书](/screenshots/webui-certs.png) |

|                日志                 |                 更多                 |
| :---------------------------------: | :----------------------------------: |
| ![日志](/screenshots/webui-log.png) | ![更多](/screenshots/webui-more.png) |

## 主要能力

默认安装会检测已安装抓包 App 并导入 CA，同时安装 WebUI 与热挂载；自定义安装可逐项选择 Reqable、ProxyPin、WebUI 或免重启热挂载。若检测到 **HttpCanary** 或 **ADGuard**，会依次询问是否导入为自定义证书。

| 能力                   | 说明 |
| ---------------------- | ---- |
| Reqable CA             | 从已安装 Reqable App 读取根证（**不内置**）；开机可再刷新；可开关 |
| ProxyPin CA            | 优先从已安装 ProxyPin App 导入；未检测到且安装时启用了 ProxyPin 时用模块内置兜底；可开关 |
| HttpCanary / ADGuard   | 仅二者在安装时可能询问导入为**自定义**证书；其它工具请手动上传 |
| 自定义证书             | 上传 PEM / DER；校验 CA、有效期、hash；显示名取自 CN / O；可点开详情 |
| 开机完整合并           | 每次重启重新生成「完整系统库 + addon」，不依赖持久化基线 |
| 分版本注入             | Android 7–13 挂载 system；Android 14+ 同时绑定 APEX 与 system 临时层 |
| 关键命名空间             | `service.sh` 补齐 PID 1、Zygote、Settings、Reqable、ProxyPin（**不扫全机应用**） |
| 用户证书热挂载（可选） | 读取用户凭据区 CA，免重启注入系统信任库；见 [配置说明](/guide/config) |
| 存储卡热挂载（可选）   | 扫描指定目录证书并免重启挂载；默认 `/sdcard/CertBridge` |
| 无痕卸载（可选）       | 只撤销本次临时会话，不改永久配置与系统文件 |
| Action 实用菜单        | 音量上刷新；音量下可挂载/卸载临时 CA（需已安装热挂载） |
| WebUI（可选）          | 概览状态、证书开关与详情、热挂载、日志；更多页可调主题 / 莫奈 / 布局 / 紧凑与字号 |
| 双层生效               | 永久配置重启生效；热挂载立即生效，重启后临时层消失 |
| 完整版 / Lite          | 完整版内置 OpenSSL；Lite 用约 8KB `cbx509` dex。详见 [安装与升级](/guide/install) |

实时源少于 10 张、复制不完整或附加证书校验失败时，模块会放弃本次注入，系统原始信任库保持不变。绑定成功后的内容检查仅记日志，不会因误判拆掉已挂上的证书层。

临时会话使用独立证书目录。**热挂载**会覆盖 PID 1、Zygote 与当前可访问的活动命名空间，并合并当前已启用的永久 addon（避免临时层盖掉 Reqable / ProxyPin）。卸载前核对会话标记与挂载身份；若其它模块叠在 CertBridge 上方，会拒绝强拆并提示重试或重启。

## 适用场景

- Reqable / ProxyPin / Charles / mitmproxy 等需要**系统 CA** 的抓包  
- Android 14+ 系统 CA 在 APEX 内、普通 `system` 覆盖无效时  

## 不做什么

- 不提供抓包代理本身（请使用 Reqable、ProxyPin 等 App）  
- **不修改 SELinux 策略**；仅给挂载用的临时证书目录设置文件上下文（`chcon`）  
- **不会**把用户凭据区证书永久「搬家」进模块；永久导入请用 WebUI / `certs/custom/`。临时试用请用可选热挂载  
- 不内置 Reqable 样例证书（须从本机 App 导入）  
