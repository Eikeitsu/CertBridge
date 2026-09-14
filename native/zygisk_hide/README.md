# CertBridge Zygisk 挂载痕迹过滤

源码位于本目录；构建产物写入 `module/zygisk/<abi>.so`。

## 双轨

| 轨 | 产物 | 默认 |
| --- | --- | --- |
| **A 经典 Zygisk** | `module/zygisk/<abi>.so` | **始终构建**（有 NDK 时） |
| **B ZN Module** | `libcb_zn_hide.so` + 模块根 `zn_modules.txt` | **关闭**；须校准会读 mountinfo 的 init 服务后再开 |

禁止空 `zn_modules.txt` 仅为出现在 ZN 列表。当前发布包只交付 A。

```bash
# 需 Android NDK（ANDROID_NDK_HOME）
npm run build:zygisk-hide

# 无 NDK 时跳过
SKIP_ZYGISK_HIDE=1 npm run build:zygisk-hide

# 仅在校准目标后开启辅路径（并自行写入非空 zn_modules.txt）
# cmake … -DBUILD_ZN_MODULE=ON
```

CI 打包会设置 `REQUIRE_ZYGISK_HIDE=1` 并编译 arm64-v8a / armeabi-v7a（仅轨 A）。

行为概要：

- 读取模块 `config/certs.conf` 中的 `zn_hide_allow`
- 轨 A：对非抓包白名单进程挂钩，过滤 mountinfo / mounts / maps / smaps 中的本模块痕迹；指向本模块的 readlink 对外为不存在
- 轨 B（可选）：对声明的服务进程做同类过滤；与 A 共用 `mount_filter.*`
- 挂钩实现位于 so 内，不能 `DLCLOSE_MODULE_LIBRARY`
- 与 SuSFS `hide_assist` 相互独立
