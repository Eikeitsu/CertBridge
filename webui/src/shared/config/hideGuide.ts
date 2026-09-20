export const HIDE_GUIDE_SECTIONS = [
  {
    id: "capture",
    title: "抓包必读：勿对 Reqable / 被抓包 App 开卸载模块",
    body: [
      "证书要生效，进程必须能看到 cacerts 上的 bind。对某 App 开启「卸载模块 / Umount modules」、DenyList+Shamiko umount、APatch「排除修改」等，会在该进程里卸掉模块挂载——证书层也会一起被卸掉。",
      "Reqable / ProxyPin 等抓包软件：不要对其开启上述 Root 隐藏。否则软件内常显示「根证书未安装」，无法正常抓包。",
      "被抓包的目标 App：也不要对其开启卸载模块 / umount 类隐藏。否则 TLS 看不到系统信任库里的抓包 CA，表现为断网、证书错误。",
      "应对「检测 Root / 检测 mount」的其它 App，才在管理器里单独开卸载模块或排除列表；与抓包链路相关的包名一律排除在隐藏名单之外。",
      "本模块的 hide_allow 会全局登记 cacerts 路径（SuSFS / ksud / NoHello）；最终是否对某进程卸挂载，仍取决于你是否对该进程启用了卸载模块 / 排除列表。抓包时请先确认 Reqable 与目标 App 均未启用。",
      "若必须对抓包 App 开着「卸载模块」又要看到证书：可在「隐藏 → 冷门实验」开启「强注抓包 App」（force_bind_capture）。注入时会再次 bind Reqable/ProxyPin，可能盖掉已卸挂载并削弱隐藏，仅建议调试时短期开启。",
      "默认仅 boot 注入证书；若难机部分 App 仍读不到 CA，可在冷门实验开「开机后晚注入」（late_inject）。开后 service 会再跑应用命名空间注入，痕迹更多，部分环境可能加重 Found KSU 类提示。",
      "仍误报 Found KSU 时，可在冷门实验关闭「开机注入 Zygote」或「注入全部 APEX」；可能牺牲兼容，改后需重启。",
    ],
  },
  {
    id: "magisk",
    title: "Magisk / Magisk Alpha / Kitsune",
    body: [
      "排除列表（DenyList）：在 Magisk App「配置排除列表」勾选要对之隐藏 Root 的应用包名。这是 Magisk v24 起替代 MagiskHide 的机制，不是旧版 Hide。",
      "强制执行排除列表（Enforce DenyList）：开启后主要对列表内 App 停用 Zygisk 模块注入，不等于完整隐藏 bind mount。与 Shamiko / NoHello 常见用法冲突——使用时通常应关闭 Enforce，把目标 App 放进排除列表。",
      "不要把 Reqable、ProxyPin 或正在抓包的目标 App 放进排除列表（若使用 Shamiko / NoHello / Zygisk umount）。",
      "推荐：ZygiskNext/ReZygisk + NoHello。开启 hide_allow 后证书桥会把 cacerts 写成 NoHello 的 point 规则；是否 umount 仍由排除列表决定（分工同 KSU：模块登记路径，用户控 App）。",
      "Magisk 官方没有路径级 umount 登记 API；仅靠 DenyList 往往卸不掉完整兼容的脚本 bind。",
    ],
  },
  {
    id: "ksu",
    title: "KernelSU / SukiSU / MKSU",
    body: [
      "仅对「需要躲检测」的 App 开启「卸载模块 / Umount modules」，并确保内核支持 path_umount（GKI 或已 backport）。",
      "Reqable、ProxyPin、以及被抓包的目标 App：请关闭「卸载模块」，否则证书不生效或抓包断网。",
      "SuSFS：若已安装隐藏组件并开启 hide_allow，证书桥会在 bind 成功后 add_try_umount 到 cacerts（隐藏页会显示「已注册」）。对未开启卸载模块的进程，证书仍应可见。",
      "可叠加 NeoZygisk、ReZygisk 或 ZygiskNext「仅还原挂载 / umount only」（同样不要对抓包链路 App 启用）。",
      "避免与 Magical OverlayFS 等冲突模块同时启用。",
    ],
  },
  {
    id: "apatch",
    title: "APatch",
    body: [
      "仅对需要躲检测的 App 启用「排除修改（Exclude Modifications）」。",
      "不要对 Reqable / ProxyPin / 被抓包目标启用排除修改，否则 CA 挂载对其不可见。",
      "apd 没有类似 ksud 的路径 umount API。请装 ZygiskNext/ReZygisk + NoHello；hide_allow=1 时证书桥登记 point 规则，排除修改决定是否对这些 App umount。",
    ],
  },
  {
    id: "limits",
    title: "对本模块的诚实边界",
    body: [
      "默认临时层在 /dev/.fs* 是为避开对 /data/local/tmp 的关键词扫描，不能替代 umount；检测方仍可能看到 cacerts 上的 bind。",
      "无 SuSFS / Zygisk umount 助手时，读 mountinfo 的检测仍可能发现异常。",
      "可选 Zygisk 过滤可去掉 App 读到的本模块 mount/maps 行，并对指向本模块路径的 readlink 返回不存在；so 仍在内存，PLT 与 Zygisk 底座仍可能被检出。",
      "Reqable / ProxyPin 在 Zygisk 过滤白名单内，不会过滤其挂载视图，以免读不到系统 CA。",
      "默认安装不含 Zygisk 过滤组件；需重新自定义安装勾选，且发布包含 zygisk/*.so。",
      "证书必须写入信任库路径才能被系统 TLS 使用；不存在无挂载的公共 CA 注入方案。",
    ],
  },
] as const;
