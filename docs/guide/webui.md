# WebUI 使用说明

证书桥 WebUI 在模块管理器中打开（KernelSU 管理器、MMRL、WebUI-X 等）。界面为 **React** 单页应用，底部导航：**首页 · 证书 · 日志 · 更多**；安装了**挂载隐藏协助**和/或 **Zygisk 挂载痕迹过滤**时会多一页 **隐藏**。

视觉体系为统一的 **Trust Signal**：浅冷灰蓝背景 + 青绿强调色；外观仅可调「浅色 / 深色 / 跟随系统」与强调色（不再提供多套布局主题包）。

## 界面预览

|                   概览                   |                 证书                  |
| :--------------------------------------: | :-----------------------------------: |
| ![概览](/screenshots/webui-overview.svg) | ![证书](/screenshots/webui-certs.svg) |

|                日志                 |                 隐藏                 |                 更多                 |
| :---------------------------------: | :----------------------------------: | :----------------------------------: |
| ![日志](/screenshots/webui-log.svg) | ![隐藏](/screenshots/webui-hide.svg) | ![更多](/screenshots/webui-more.svg) |

示意图为结构示意；真机截图可在发版时替换 `docs/public/screenshots/` 下同名文件。

## 打开方式

1. 安装时选择默认安装或自定义安装并勾选 **WebUI**
2. 重启后在模块管理器进入 **证书桥 → WebUI**
3. 需管理器提供 shell 桥接（普通浏览器无法执行模块命令）

若提示「未检测到 WebUI 桥接」，请换用支持模块 WebUI 的客户端。

---

## 首页

首页只回答「信任是否生效」：

| 区域         | 内容                                         |
| ------------ | -------------------------------------------- |
| Status Stage | 大标题状态、生效证书摘要、刷新复核 / 重启    |
| 指标         | 已启用 / 自定义 / 基线                       |
| 内置 chips   | Reqable / ProxyPin 紧凑状态                  |
| 环境详情     | 折叠：设备、系统、Root、注入、挂载模式、版本 |

挂载与隐藏实况、分 Root 方案的隐藏说明在 **「隐藏」** 页；详见 [挂载隐藏说明](/guide/hide)。

### 刷新复核

点 **刷新复核** 会：

1. 尝试从已启用的 **Reqable / ProxyPin App** 同步最新 CA（指纹未变则跳过）
2. **强制实测**注入状态并回写缓存（`status --live`）
3. 重新读取自定义证书列表

开机后若短暂显示「稳定中 / 注入中」，页面会自动静默复核；也可手动点刷新。

### 注入失败诊断

当注入异常时，首页会显示 **诊断卡片**（原因 + 建议），并提供 **查看日志** 入口。常见提示包括：

| 情况               | 说明                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| 证书集合生成失败   | 未改动系统信任库，可查日志中 `generation`                             |
| 临时层 / bind 失败 | 检查 `/dev` 或 `/data/local/tmp` 空间与权限；可切换临时路径风格后重启 |
| 命名空间注入失败   | 建议重启后重试；目标 App 需强停再开                                   |
| 轻量叠层未生效     | KernelSU 等需确认 Magic Mount 是否正确                                |
| 校验未通过         | 主信任库路径上未见启用证书；若抓包已正常可忽略并反馈                  |

模块 **Action** 与列表简介也会同步显示相同诊断文案。

---

## 证书

### 抓包应用证书（Reqable / ProxyPin）

- 显示产品图标与当前证书名称（来自 App 导入或 ProxyPin 内置兜底）
- **开关**：开启 / 关闭附加证书（**重启后生效**）
- **详情**：点击 ℹ️ 从底栏打开分组详情（主体、颁发者、有效期、公钥/签名、扩展、指纹），点按可复制
- 副标题提示：
  - 「已应用 / 已开启待重启 / 已关闭仍在生效」等状态
  - 未检测到证书时提示先在 App 内生成

开启开关前会尝试从 App 刷新；若无可用来源会拒绝开启。

### 自定义证书

- 上传 **PEM / DER**（按内容识别，不必改后缀）
- **从常见路径导入**：HttpCanary、ADGuard、Charles、mitmproxy、PCAPdroid
- **复制已应用指纹**：导出当前生效集 SHA-256
- 适用于上述软件，或 App 未自动检测到时
- 导入后 **重启生效**；可查看详情与删除
- 下拉刷新也会尝试同步指纹未见的现场 CA

### 临时免重启挂载

若安装时启用了热挂载组件，证书页底部会出现 **临时免重启挂载** 区域：

| 操作           | 说明                                           |
| -------------- | ---------------------------------------------- |
| 挂载用户证书   | 读取各用户「用户证书」并临时提升为系统信任     |
| 挂载存储卡证书 | 默认目录 `/sdcard/Documents/cacerts`，路径可改 |
| 挂载全部       | 用户区 + 存储卡合并                            |
| 无痕卸载       | 仅撤销本次临时会话                             |

临时挂载 **立即生效**，**重启后消失**，不改永久配置。详见 [配置说明 · 热挂载](/guide/config#临时免重启挂载热挂载)。

---

## 日志

- 查看 `data/install.log` 尾部（安装、开机注入、同步等）
- **刷新** / **清空**（清空不影响证书配置）
- 排查注入失败时，可搜索 `inject:`、`generation:`、`post-fs-data`、`service`

---

## 隐藏

在安装了「挂载隐藏协助」和/或「Zygisk 挂载痕迹过滤」后出现（**默认安装会装上 SuSFS 协助**；Zygisk 过滤仅自定义可选）。文档站完整版见 [挂载隐藏说明](/guide/hide)。

| 区域            | 内容                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **抓包注意**    | 醒目提示：勿对 Reqable / 被抓包 App 开卸载模块，否则「根证书未安装」或断网                         |
| 抓包检查清单    | 首次打开可关闭的步骤卡片                                                                           |
| SuSFS 开关      | `hide_allow`：开启后后台登记 try_umount / NoHello（不堵 UI）；关闭后不登记；内核登记通常需重启才清 |
| Zygisk 过滤开关 | `zn_hide_allow`；改后强停相关 App 生效；未安装时提示需自定义重刷                                   |
| 强注抓包 App    | `force_bind_capture`：开启后后台补绑运行中的 Reqable/ProxyPin；关闭后请强停再开                    |
| 开机后晚注入    | `late_inject`：默认关；开后 service 再 namespaces 注入（难机兼容），开启时也会后台补一次           |
| Zygisk 底座     | 探测 Magisk / ZygiskNext / ReZygisk / NeoZygisk；未开时告警                                        |
| 抓包白名单      | 编辑 `zn_whitelist.txt`；名单内不过滤 mount/maps                                                   |
| 挂载与隐藏实况  | Root、挂载模式、临时层、助手、try_umount、Zygisk 过滤与底座                                        |
| 简介 / 说明     | 文档入口与按 Root 方案的隐藏说明                                                                   |

**抓包时：** 对 Reqable / ProxyPin 与被抓包目标 **关闭**「卸载模块 / Umount / 排除修改」等 Root 隐藏，证书才能对其生效。详见 [挂载隐藏 · 抓包必读](/guide/hide#抓包必读不要对抓包链路开卸载模块)。

---

## 更多

### 外观

| 选项   | 说明                      |
| ------ | ------------------------- |
| 深浅色 | 跟随系统 / 浅色 / 深色    |
| 强调色 | 青绿 / 钢蓝 / 暖石 / 墨黑 |
| 字号   | 滑条调节                  |

### 挂载模式

- **完整兼容**（默认）：运行时整库 bind
- **轻量 Magic**：仅叠 addon 证书；Android 14+ 仍对 APEX 脚本注入

切换后需 **重启**。详见 [配置说明 · 挂载模式](/guide/config#挂载模式)。

### 临时挂载路径

- **Dev 路径**（默认）：`/dev/.fs0` / `/dev/.fs1`
- **Mnt 路径**：`/mnt/.ca0` / `/mnt/.ca1`
- **短路径**：local/tmp 下的 `.fs0` / `.fs1`
- **传统路径**：`sys-ca-merge*`

切换后需 **重启**。换路径不能替代 umount 隐藏。抓包时勿对 Reqable / 目标开卸载模块，见 [常见问题](/guide/faq#root-cert-missing)。

### 动态模块简介

默认关闭：管理器列表保持中性产品文案。开启后，列表 `description` 会写入 emoji 运行状态。WebUI 内状态页不受影响。详见 [配置说明 · 动态模块简介](/guide/config#动态模块简介quiet_prop)。

### 更新通道

- **正式**：与管理器在线更新相同（GitHub Pages）
- **CI**：读 `ci-dist` 分支上的 `update.json` 与 zip（清单与产物同分支）；可选经 jsDelivr

可检查更新并下载安装。模块刷入后若启用热更新组件（`hot-reload` 合入后），仅 WebUI / 非开机脚本变更可能免重启。

### 关于

版本、系统信息、文档与开源链接、Reqable / ProxyPin 外链、打赏码等。

---

## 与 Action 的分工

| 入口       | 适合做什么                                                              |
| ---------- | ----------------------------------------------------------------------- |
| **WebUI**  | 改开关、导入证书、热挂载、看日志、调外观与挂载模式、查看隐藏说明        |
| **Action** | 只读仪表盘：版本、状态、注入诊断、热挂载摘要、日志路径（约 10s 内完成） |

Action **不再**提供音量键热挂载菜单；临时挂载请用 WebUI。

---

## 常见问题（WebUI）

**刷新后提示「已从 App 更新 N 张证书」**  
表示 Reqable / ProxyPin 根证有变化，需重启后进入开机证书层。

**开关已关但显示「仍在生效」**  
旧挂载尚未卸除，重启后才会移除。

**WebUI 能打开但状态一直加载失败**  
检查管理器 WebUI 桥接；Action 中 `状态 CLI` 行可用于对比。

更多排障见 [常见问题](/guide/faq)。

---

## 命令行（adb）

模块提供 shell CLI（**不是**独立原生可执行文件）。短包装：`bin/cb`。

```bash
# 帮助（分组命令 + 缩写）
adb shell su -c '/data/adb/modules/CertBridge/bin/cb help'
adb shell su -c '/data/adb/modules/CertBridge/bin/cb help set'

# 读缓存状态（轻量）
adb shell su -c '/data/adb/modules/CertBridge/bin/cb status'
# 缩写
adb shell su -c '/data/adb/modules/CertBridge/bin/cb st'

# 强制实测注入并回写状态（与 WebUI「刷新复核」相同）
adb shell su -c '/data/adb/modules/CertBridge/bin/cb status --live'
# 或
adb shell su -c '/data/adb/modules/CertBridge/bin/cb verify'

# 读/写单项配置（set 走专用校验，与 set_* 长名等价）
adb shell su -c '/data/adb/modules/CertBridge/bin/cb get late_inject'
adb shell su -c '/data/adb/modules/CertBridge/bin/cb set late_inject 1'
adb shell su -c '/data/adb/modules/CertBridge/bin/cb li 1'
```

常用子命令：`toggle`、`install_custom`、`list_custom`、`set_mount_mode`、`hot_mount` / `hot_unmount`、`get` / `set`。完整列表与缩写见 `cb help` / `cb help aliases`。未知命令会返回 `error=unknown_command` 并提示接近的名称。
