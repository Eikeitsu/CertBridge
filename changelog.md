# 更新日志

## Unreleased

> 为了减小模块体积，从 **4.2.1** 开始按架构分包
>
> 多数人一般安装 `arm64` 架构的模块即可，模拟器虚拟机请自行选择合适的架构

- **按架构分包**：完整版默认 4 包 `*_arm64.zip` / `*_arm.zip` / `*_x86.zip` / `*_x64.zip`；另有 lite。`updateJson` / ci-dist 默认 `CertBridge_arm64.zip`。旧式合包 `PACKAGE_FAT=1` → `*_fat.zip`
- **证书开关**：关/开写 `user.conf` 不抢 generation 写锁（避免热更新后 post-fs 占锁导致保存失败）；关不播种；开先本地再跨 ns 扫 App
- **WebUI**：首屏内联 loading + 主题色，CSS 先于 JS，先进壳层再拉 status；更多页拆「外观」「挂载与注入」并支持「显示隐藏页」；统一底部抽屉动画；Toast / 开关交互与底栏 Tab 稳定性改进
- **文档重写**：按当前模块能力重写使用手册
- **CI / 工程**：Node 24；同提交改 Web 时打包门控；`INPUT_DIGEST` 去重；Lint 并行 web/shell/tooling；发版可晋升 ci-dist；接入 `setup-ndk-clang`；Lint/Format 覆盖 Python / Java / C/C++（有 native 时）

## v4.2.0

> 解决了春秋检测词条：Found ksu/免解设备
>
> 如果依然还有该检测词条，请检查是否使用了其它 mount 模块

- **冷门实验默认痕迹最少**：`boot_bind_zygote` / `boot_multi_apex` / `service_probe` 默认均为 `0`；证书异常时再在「冷门实验」打开兼容项。升级若已有旧值会保留
- **开机加速（不改双模式）**：无残留跳过 detach；generation 用轻量 source 指纹 + 整目录拷贝；当前 ns 已是 init 则不再 nsenter pid1；`late_inject=0` 绑定时去掉可见性/整库探测只留 mount --bind
- **冷门实验语义补齐**：`boot_multi_apex=0` 在 14+ 仅主 APEX（跳过 `@版本` 与 system）；`late_inject=0` 时 service 自动不退避、不 heal。打开 `boot_multi_apex=1` 仍完整走双模式目标列表
- **开机加速（此前）**：APEX/`@版本` 共用同一 tmpfs 层；`generation_source_busy` 不扫全机 `/proc`；无热会话跳过 hot unmount；detach 重试收敛
- **冷门实验子页**：强注 / 晚注入 / 上述三项收入「隐藏 → 冷门实验」
- **晚注入开关**：`late_inject`（默认关）
- **CLI 友好化**：`cb help` / 缩写 / 统一 `get`/`set`
- **外部目录收敛**：热更新等到 `/data/adb/certbridge/`
- **进一步减少开机痕迹**：`late_inject=0` 时跳过整库 cksum、orphan 不进 zygote、状态默认只核 init

## v4.1.2

- **装了隐藏但关着**：不再每次注入无谓 `hide_clear_applied`；仅当存在本模块残留状态时才清理（更接近「未安装」）

## v4.1.1

- **关闭 hide_allow 即时卸登记**：清 try_umount.txt / NoHello 的同时对已知 cacerts 路径执行 `ksud kernel umount del`（不 wipe 全表）

## v4.1.0

- **减轻晚注入 / KSU 误伤**：service 命名空间阶段默认不再二次 nsenter zygote/init（boot 已注入）；仅当 mountinfo 看不到本模块 bind 时才补注 zygote
- **隐藏探测更省**：`hide_allow=0` 时 status 不再执行 `ksud` / `ksu_susfs`；开启后按 boot 缓存探测结果，避免每次刷新拉起
- **强注抓包 App 开关**：`force_bind_capture`（默认关）。开启后命名空间注入会再次 bind Reqable/ProxyPin（旧行为），开着「卸载模块」也可能显示证书已安装；默认尊重卸载、不强注
- **NoHello 适配**：检测到 NoHello 时，`hide_allow=1` 会把 cacerts 写成 `/data/adb/nohello/umount` 的 `point` 规则（托管块）；Magisk 排除列表 / APatch 排除修改决定对哪些 App umount，分工同 KSU
- **修复兼容模式不尊重 KSU 卸载模块**：post-fs 过早探测失败不再整轮缓存；先写入 `susfs4ksu/try_umount.txt` 供 post-mount/boot-completed 重登记；有 `ksu_susfs`/`ksud` 即尝试当场登记；service 晚注入后再强制登记一次
- **KSU-Next kernel_umount**：登记前尝试 `ksud feature set kernel_umount 1`（特性关闭时即使有路径也不会卸）；按 mountinfo 实况补登记；隐藏页展示特性与 try_umount.txt 路径
- **hide_allow 当场登记**：开启隐藏协助或 `hide_reregister` 立即写 try_umount / 调 ksud，验证卸载只需强停 App，不必为此反复重启
- **开关不堵 UI**：`hide_allow` / `force_bind_capture` 只同步写 conf 并立刻返回；SuSFS/ksud 登记与抓包 App 补绑放后台；WebUI 乐观更新 + 延迟刷新实况

## v4.0.0

- **挂载隐藏协助组件**：安装时可带上隐藏协助脚本；WebUI「隐藏」页用已有开关控制是否在注入 / 热挂载成功后登记 umount 路径（`hide_allow`）
- **不强制 SuSFS**：有 SuSFS / KernelSU umount 时自动配合登记；没有也能正常用证书。Magisk 等可继续搭配 Shamiko、ZygiskNext 等做进程侧卸载隐藏
- **登记时机更完整**：开机注入成功会登记；轻量 Magic 挂载、热挂载的多个证书目标也会登记；仅成功绑定的目标才写入，避免误报「已登记」
- **先探测再登记**：登记前检查设备是否具备对应 umount 能力；隐藏页实况可看到是否已登记、是否检测到 SuSFS 等
- **可选开机持久化**：若本机已有 susfs4ksu 配置目录，成功登记后写入其列表，方便开机后再次生效；关闭隐藏开关时会去掉本模块写入的路径
- **卸载与热挂载路径清理**：覆盖默认 `/dev/.fs`*、`/mnt/.ca*` 以及历史 `/dev/.cb*` 等临时层，减少残留
- **文案与文档**：隐藏说明、截图、WebUI 指引与配置注释对齐当前默认临时路径
- **尊重「卸载模块」**：开机命名空间注入不再强注 Reqable / ProxyPin，避免二次 bind 盖掉 KSU 已卸的挂载；抓包 App 继承 Zygote，开卸载时由 try_umount 剥离
- **下载更新交互动画**：下载 / 写入 / 安装分阶段进度；默认柔和进度条、精简扫描条、控制台 ASCII 条，三套主题各自样式

## v3.0.0

- **WebUI**：使用 React 全面重构模块 webui
- **更新通道**：正式（Pages）与 CI（`ci-dist`），可检测下载，CI 可选 jsDelivr，支持无人值守刷入；
- **是否挂载 system**：支持设置 Android 14+ 是否挂载 system（`experimental_14_system`）；
- 刷新复核走 `status --live`；注入失败展示可读原因；
- **模块免重启热更新**：已安装且启用时，若本次未改 `system/`、`sepolicy.rule`、`zygisk/`，刷入后可热切换模块目录并重跑注入，无需重启；首次安装、模块禁用、或上述路径有变更时仍提示重启；失败则回退标准更新流程（保留 `update` 标记）
- **CI**：Package Module 推送 `ci-dist`（`update.json` + zip）；Build Web 只出 artifact 并串联重打包；停用 `dist-web` 作为更新通道
- **文档 / 工程**：新增 [WebUI 使用说明](/guide/webui) 与双通道、分支说明；补齐 lint / husky；修复文档站死链与打包校验问题；修复部分管理器（如 SukiSU）桥接偏晚导致 WebUI 无法执行 shell

## v2.3.1

- 增强对 Android 14+ 的隐藏能力，消除更多挂载痕迹，默认不再挂载 `/system/etc/security/cacerts`
- 实验配置 `experimental_14_system`（`auto` / `skip`，**默认 `skip`**）：Android 14+ 下对**两种挂载模式均生效**；默认跳过 system、只脚本注入 APEX；设为 `auto` 则按挂载模式处理 system。需要 system 叠 addon 请用正式模式 `magic` 并设 `auto`。改 `certs.conf` 或 `cb set_experimental_14_system` 后需重启
- 挂载模式文档补充 Android 7–13 / 14+ 行为对照；说明完整兼容在 `auto` 时会在 `/system/etc/security/cacerts` 留下整库 bind，可改用轻量 Magic 或保持默认 `skip`
- 挂载策略由 `mount_mode` 与实验项正交组合；模块简介兼容范围更新为 Android 7–17

## v2.3.0

- 开机注入更稳：状态校验失败会退避重试并延迟自愈；改过开关后按新配置重建证书集
- 切换挂载模式时清理 staged 叠层；DER 证书导入走快路径，减少导入失败
- 新增 `cb` / `status --live` / `verify` 等 CLI，便于终端核对注入与信任库状态
- 模块脚本按域拆分到 `bin/lib/`，并为 Magisk 环境补齐 shebang，避免安装后无法执行
- 降低注入层特征：默认临时路径 `/dev/.fs*`，注入后拆除临时挂载点；热挂载标记改为 `.sess`
- 新增 `quiet_prop`（默认开）：管理器列表保持中性简介，不写 emoji 运行状态；需要时可用 `cb set_quiet_prop 0` 打开动态简介
- CI / 文档：适配拆分后的 vanilla Web 构建与 FAQ 死链；同步打包脚本；补充开机状态假阴性说明

## v2.2.1

- 修复软重启后仍可能继续注入已关闭证书的问题（如关掉 ProxyPin 后仍报注入失败 / 挂载残留）
- WebUI：证书开关已关但旧证尚未卸掉时，会提示「仍在生效（重启后移除）」
- Action 改为只读仪表盘（适配 SukiSU 约 10s 脚本超时），去掉易被掐断的音量键长操作
- CI：Release 拆为 build / publish / post；Web 构建与 `dist-web` 发布分离；共用 Node 安装 action

## v2.2.0

- 修复 KernelSU 越狱模式软重启后状态不更新：软重启不换内核 `boot_id`，原先会跳过证书集重建并卡住「待重启」/旧缓存；现用 `boot-epoch` 区分用户态周期，并允许同 boot 重建待生效配置

## v2.1.0

- 新增挂载模式：`compatible`（默认，完整兼容 / 运行时 bind）与 `magic`（轻量 Magic Mount，仅叠 addon）
- 自定义安装增加音量键选择挂载模式；默认安装固定完整兼容
- WebUI「更多」可切换挂载模式，并说明 Magisk / KernelSU 与挂载元模块关系
- 开机注入与热挂载的临时层改到 `/data/local/tmp/sys-ca-merge{,-hot}`，降低 mountinfo 中的模块路径暴露
- 发版时自动将 `changelog.md` 的 `Unreleased` 提升为版本号；文档站两份 changelog **不含 Unreleased**
- 发版约定见 `tooling/RELEASE.md`

## v2.0.0

- 证书来源重构：不再内置 Reqable，优先从已安装 App 自动导入；ProxyPin 优先 App，未检测到且安装时选了 ProxyPin 则使用模块内置证书；检测到 HttpCanary、ADGuard 等依次询问是否导入为自定义证书
- WebUI 证书名称从证书 subject（CN/O）自动解析，支持点击展开详情（主题、颁发者、有效期、指纹等）；自定义证书同样显示可读名称
- 模块结构再梳理：证书域拆为探测 / 解析 / 来源；安装编排独立为 `install_flow`；`common.sh` 按 install / runtime 场景按需加载
- 内置多架构静态 OpenSSL，解决刷入环境无 openssl 导致 App 证书无法导入的问题；安装日志输出导入诊断与证书目录结果
- 安装时按设备 ABI 只保留一份 OpenSSL，删除其余架构，设备占用约从 28MB 降到约 7MB
- 发布 zip 默认只打入 arm + arm64（覆盖真机）；模拟器可设 `OPENSSL_ABIS=all` 打入 x86/x64
- 新增 **Lite** 版：用约 8KB 的 `cbx509` dex 替代内置 OpenSSL；打包同时产出完整版与 `*_lite.zip`（完整版仅含 OpenSSL，不含 dex）
- 修复 Magisk 解压后二进制无执行位时，内置 OpenSSL 在 chmod 前被 `-x` 误判为不可用
- 修复证书显示名写入 applied 列表后，校验仍按三列解析导致 checksum 永远不匹配、状态误报「注入失败」
- 全新品牌图标：色底版用于模块列表 / 文档导航，浮动标区分深浅主题用于文档 Hero
- WebUI 顶栏与「关于」页接入品牌图标，浮动标随浅色 / 深色主题自动切换；发布包同步打入 `icon.png`

## v1.2.0

- 模块脚本按功能拆分到 `bin/lib/`，`common.sh` 仅作加载入口
- Action 增加实用功能：音量上刷新状态，音量下进入菜单，可免重启挂载/卸载用户区与存储卡临时 CA；并优化音量键每轮独立计时，降低漏键与连按才响应
- 为 APEX 与 system 信任库分别建立临时挂载层，按目标路径设置 SELinux 后再绑定到命名空间；放宽带 MCS 类别机型的上下文比对，避免误拒证书层准备
- 提升开机注入稳定性：不再在 post-fs 过早判定失败，命名空间注入改为覆盖 Zygote 与相关应用（避免全量扫描导致 service 挂起）；绑定已成功时内容/归属检查失败只记日志、不再 umount 回滚，并取消 bind 后 `remount,ro`（修复「证书可见但抓包仍失败 / 断网」）
- 开机注入结果写入运行时状态缓存，WebUI 与模块简介只读缓存并取消后台轮询；修复简介被开机服务覆盖、状态卡住「注入中 / 检测中」等问题
- 模块显示名改为「证书桥」；列表简介改为 `[大状态|子状态] 说明`（如 `[✅运行正常|已挂载:2] 当前生效：Reqable、ProxyPin`；emoji 后无空格，括号内 `|` 不加空格），括号外必有说明，仅首次未运行时展示模块定位；开关、导入、热挂载后同步刷新

## v1.1.1

- 修复 Android 14+ 仅注入 APEX、未覆盖 system 路径导致 Reqable 等检测「证书未安装」的问题；现同时运行时绑定 APEX 与 system
- 开机后命名空间注入扩展到抓包 App 与已运行应用，避免 Settings 能看到证书但抓包 TLS 仍失败 / 断网（注：自 v1.2.0 起改为仅关键命名空间，不再扫全机应用）
- 临时热挂载会合并已启用的永久 addon，且同样覆盖 APEX / system 双路径
- 重做普通深色配色与卡片层次；莫奈深色改为跟随系统色相 / MD3 token，不再与固定深色共用一套写死色值
- 移除深色顶栏浅色状态栏条，改为依赖 `color-scheme` 与 theme-color 同步状态栏

## v1.1.0

- 移除持久化系统 CA 基线与 `system/cacerts` 覆盖目录，改为每次开机从当前 system / Conscrypt APEX 信任库生成完整证书集
- 生成阶段校验证书数量、复制结果、附加证书校验和及 SELinux 上下文；任一步失败都保留系统原始信任库
- Android 7–13 注入 system，Android 14+ 注入 Conscrypt APEX；挂载增加所有权校验、只读重挂载、失败回滚和关键命名空间复核
- 永久证书配置改为重启后生效；自定义 CA 支持 PEM / DER、有效期与 `CA:TRUE` 校验，并自动处理 subject hash 冲突
- 新增可选的用户凭据区与存储卡证书免重启挂载，临时会话按来源和挂载身份安全卸载，不修改系统文件
- 安装脚本支持音量键选择默认或自定义方案，可分别启用 Reqable、ProxyPin、WebUI 和免重启热挂载
- WebUI、CLI 与 Action 增加待重启、注入失败及临时会话状态；未安装可选组件时自动隐藏或降级对应功能
- 加强写锁、目录权限、日志轮转、Root 环境识别与发布包完整性检查

## v1.0.2

- 紧急修复 KernelSU Magic Mount 将系统 CA 目录遮蔽为仅剩 Reqable、ProxyPin 两张证书的问题
- 紧急修复运行时证书合并失败后系统信任库为空、导致 TLS 连接及抓包断网的问题
- 恢复系统 CA 基线方案，始终以“完整系统基线 + 模块证书”生成挂载内容
- 安装时至少捕获 10 张系统 CA 才允许继续，基线缺失时中止安装
- Android 14+ APEX 与传统 system 路径分别从系统基线生成 tmpfs
- 增加 PID 1、Zygote 与系统设置进程的注入日志

## v1.0.1

- 项目更名为证书桥（CertBridge），模块显示名调整为「系统 CA 证书」
- 移除持久化系统 CA 基线抓取，改为每次注入时现场读取并增量合并系统信任库
- 模块目录仅保存需要追加的证书，重启后挂载自动消失，不修改系统分区
- 保留证书数量安全检查，系统信任库异常时拒绝执行覆盖挂载
- 优化深色模式文字与状态栏对比度，修复莫奈取色下无法切换深色模式
- 增加打赏码、酷安主页和四张 WebUI 预览截图
- WebUI「关于」页面新增在线使用文档入口
- 项目文档、安装路径、构建产物及更新地址同步适配 CertBridge
- 发版时自动同步 `package.json`、`package-lock.json` 与模块版本号
- 更新日志支持手写优先、缺失时自动生成，并可直接在文档站查看
- 更新日志与模块 ZIP 同步部署到 GitHub Pages，改善更新检查与下载体验

## v1.0.0

- 首次发布系统 CA 证书模块与 KernelSU WebUI
- 内置 Reqable / ProxyPin CA，支持独立开关与自定义证书
- 支持 Android 7–16；Android 14+ APEX Conscrypt 注入
- WebUI 提供概览、证书管理、日志和显示选项
