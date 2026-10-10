# CertBridge CI


- **文档**：新增 [LSPosed 模块](docs/guide/lsposed.md) 页面，收集社区一些 ssl 证书相关 XP 模块以及 vpn 代理相关模块
- **安装音量键**：`install/tools/volkey`（`EVIOCGRAB`）仅安装期防系统音量条；装完随 `install/` / `META-INF` / `customize.sh` 清除，不进运行时模块目录；缺省回退 `getevent`
- **修复 Zygisk 过滤误伤正常 App**：默认不再从 maps/smaps 抽掉匿名可执行页（曾导致闪退/断网）；仅过滤本模块路径痕迹。可选 `zn_hide_anon_exec=1`；收紧 mount 表路径匹配
- **Zygisk 黑白名单**：`zn_filter_mode=blacklist`（默认，仅过滤黑名单，空=不过滤）\| `whitelist`（名单内豁免，空≈全机）；`zn_blacklist.txt` / `zn_whitelist.txt`；抓包永久豁免
- **补齐读表漏网路径**：相对 `maps`+`/proc` dirfd、`fopen`、`__open_2`；主机单测 `npm run test:zygisk-filter`
- **隐藏页**：明确「过滤 ≠ 卸载模块」；抓包检查提示 umount 会没证；勿再把正常 App 塞进「不过滤白名单」当修复
- **轨 B（ZN Module）**：仅当 `zn_modules.txt` 有活动行且 so 已构建时打包；禁止空壳刷列表
- **路径指纹**：注入后 orphan staging；mountinfo 仍含 `modules/CertBridge` 时告警（Magic Mount），建议 `compatible` + `tmpfs_style=dev`
