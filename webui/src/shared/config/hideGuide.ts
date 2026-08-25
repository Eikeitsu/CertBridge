export const HIDE_GUIDE_SECTIONS = [
  {
    id: "magisk",
    title: "Magisk / Magisk Alpha / Kitsune",
    body: [
      "排除列表（DenyList）：在 Magisk App「配置排除列表」勾选要对之隐藏 Root 的应用包名。这是 Magisk v24 起替代 MagiskHide 的机制，不是旧版 Hide。",
      "强制执行排除列表（Enforce DenyList）：开启后主要对列表内 App 停用 Zygisk 模块注入，不等于完整隐藏 bind mount。与 Shamiko 常见用法冲突——使用 Shamiko 时通常应关闭 Enforce，把目标 App 放进排除列表，由 Shamiko 处理挂载隐藏。",
      "Magisk 可安装 ZygiskNext、ReZygisk、NeoZygisk（通常需关闭内置 Zygisk），它们同样能对目标进程 umount 模块挂载痕迹。",
      "常见组合：Shamiko；或 ZygiskNext/ReZygisk/NeoZygisk 的 umount / 遵循排除列表；或 Zygisk Assistant / NoHello（偏 bind mount 隐藏）。",
    ],
  },
  {
    id: "ksu",
    title: "KernelSU / SukiSU / MKSU",
    body: [
      "对目标 App 开启管理器的「卸载模块 / Umount modules」，并确保内核支持 path_umount（GKI 或已 backport）。",
      "SuSFS：若内核与用户空间工具可用，证书桥会在 bind 成功后自动 add_try_umount 到 cacerts 路径（隐藏页会显示「已注册」）。",
      "可叠加 NeoZygisk、ReZygisk 或 ZygiskNext「仅还原挂载 / umount only」。",
      "避免与 Magical OverlayFS 等冲突模块同时启用。",
    ],
  },
  {
    id: "apatch",
    title: "APatch",
    body: [
      "对目标 App 启用「排除修改（Exclude Modifications）」。",
      "建议安装 NeoZygisk、ReZygisk 或 ZygiskNext（umount only），与 bindhosts 隐藏指南一致。",
      "也可使用 Zygisk Assistant / NoHello 辅助隐藏 bind mount。",
    ],
  },
  {
    id: "limits",
    title: "对本模块的诚实边界",
    body: [
      "默认临时层在 /dev/.cb* 是为避开对 /data/local/tmp 的关键词扫描，不能替代 umount；检测方仍可能看到 cacerts 上的 bind。",
      "无 SuSFS / Zygisk umount 助手时，读 mountinfo 的检测仍可能发现异常。",
      "不存在类似 ZN-hostsredirect 的「无挂载 CA 注入」公共方案；证书必须写入信任库路径才能被系统 TLS 使用。",
    ],
  },
] as const;
