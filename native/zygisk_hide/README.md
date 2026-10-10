# CertBridge Zygisk 挂载痕迹过滤

源码位于本目录；构建产物写入 `module/zygisk/<abi>.so`。

## 双轨

| 轨                | 产物                                         | 默认                                              |
| ----------------- | -------------------------------------------- | ------------------------------------------------- |
| **A 经典 Zygisk** | `module/zygisk/<abi>.so`                     | **始终构建**（有 NDK 时）                         |
| **B ZN Module**   | `libcb_zn_hide.so` + 模块根 `zn_modules.txt` | **关闭**；须校准会读 mountinfo 的 init 服务后再开 |

禁止空 `zn_modules.txt` 仅为出现在 ZN 列表。`module/zn_modules.txt` 有非注释活动行时，`npm run build:zygisk-hide` 会自动 `BUILD_ZN_MODULE=ON`；打包仅在存在活动行且 so 已构建时打入轨 B。

```bash
npm run build:zygisk-hide
SKIP_ZYGISK_HIDE=1 npm run build:zygisk-hide   # 无 NDK
npm run test:zygisk-filter                       # 主机单测
```

CI：`REQUIRE_ZYGISK_HIDE=1` + `REQUIRE_ZYGISK_FILTER_TEST=1`。

## 过滤判定

- `zn_hide_allow` 门控
- `zn_filter_mode=blacklist`（默认）：仅 `config/zn_blacklist.txt` 内挂钩；空=不过滤
- `zn_filter_mode=whitelist`：除 `config/zn_whitelist.txt` 外挂钩；空≈全机（慎用）
- 抓包 App 永久豁免

挂钩：`open` / `__open_2` / `openat` / `fopen` / `read` / `pread64` / `readlink*`。  
默认不藏匿名可执行 maps（`zn_hide_anon_exec=1` 才开）。  
更新 so 后需重装并强停相关 App（或重启）才生效。
