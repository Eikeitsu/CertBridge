# CertBridge CI


- **Zygisk 过滤稳健性（so）**：非目标进程 `DLCLOSE` 卸库；目标进程保留 so。mountinfo/mounts **擦洗路径字面量、保留整行**（不再删行扯断 mount id）。hooks 异常 **fail-open**；readlink 目标改写为良性路径（不再 `ENOENT`）。更新 `zygisk/*.so` 需**重启**后生效
- **挂钩目标默认藏跳板 maps**：「默认不藏匿名页」改为——黑名单命中后默认从 maps/smaps 隐藏 `[anonymous]` 可执行页（PLT 跳板；smaps 仍整段 VMA 丢弃）；无名 `00:00 0` 可执行页仅藏 ≤4MiB。显式 `zn_hide_anon_exec=0` 可关。改名单后强停 App
