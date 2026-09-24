# 命令行 CLI

装完模块后（需 Root：`adb shell` / `su`）：

```bash
/data/adb/certbridge/cb help
/data/adb/certbridge/cb status
```

外部入口在 `/data/adb/certbridge/cb`（转发到模块内 `cert_manager.sh`）。模块内 `bin/cb` 仍可用。**不**挂到 `system/bin`。

## 常用命令

| 命令 / 缩写                               | 作用                                          |
| ----------------------------------------- | --------------------------------------------- |
| `help` / `-h`                             | 帮助；可跟主题 `set` / `get` / `hot` / `hide` |
| `status` / `st` [`--live`]                | 状态；`--live`=实测回写（同 `verify`）        |
| `verify` / `v`                            | 等同 `status --live`                          |
| `get` / `g` `<key>`                       | 读单个 conf 键                                |
| `set` `<key>` `<value>`                   | 统一写入（走专用校验与副作用）                |
| `toggle` / `t` `reqable\|proxypin` `0\|1` | 证书源开关                                    |
| `sync_apps` / `sa`                        | 从 App 再同步内置源                           |
| `list_custom` / `ls`                      | 自定义证书列表                                |
| `list_applied_fps` / `lf`                 | 已应用指纹                                    |
| `cert_info` / `info` `<目标>`             | 证书详情                                      |
| `install_custom` / `ic` `<b64>`           | 安装自定义（WebUI 用）                        |
| `import_app_preset` / `ip` `<名>`         | 导入预设                                      |
| `remove_custom` / `rm` `<文件>`           | 删除自定义                                    |
| `hot_mount` / `hm` `user\|sd\|all` [路径] | 临时热挂载                                    |
| `hot_unmount` / `hu`                      | 卸载临时会话                                  |
| `set_hide_allow` / `hide` `0\|1`          | 隐藏协助开关                                  |
| `hide_reregister` / `hr`                  | 立刻重登记 try_umount                         |
| `set_zn_hide_allow` / `zn` `0\|1`         | Zygisk 过滤开关                               |
| `get_zn_whitelist` / `gzn`                | 读白名单                                      |
| `set_zn_whitelist` / `szn` `<b64>`        | 写白名单                                      |

已停用：`reinject` / `sync` → 提示需重启（热重载已关闭）。

## `set` 可设键

```bash
cb set <key> <value>
# 或 cb help set
```

| 键                                                                                              | 取值                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| `mount_mode`                                                                                    | `compatible` \| `magic`               |
| `experimental_14_system`                                                                        | `auto` \| `skip`                      |
| `tmpfs_style`                                                                                   | `dev` \| `mnt` \| `short` \| `legacy` |
| `quiet_prop` / `hot_allow` / `hide_allow` / `zn_hide_allow`                                     | `0` \| `1`                            |
| `force_bind_capture` / `late_inject` / `boot_bind_zygote` / `boot_multi_apex` / `service_probe` | `0` \| `1`                            |
| `reqable` / `proxypin`                                                                          | `0` \| `1`（同 `toggle`）             |

隐藏 / Zygisk 相关需对应组件已安装，否则返回 `zn_hide_feature_not_installed` 等错误。

## 示例

```bash
cb st
cb status --live
cb set mount_mode compatible
cb set late_inject 1
cb t reqable 1
cb sa
cb hm user
cb hu
cb hide 1
cb hr
cb help aliases
```

## 相关路径

| 路径                                  | 说明               |
| ------------------------------------- | ------------------ |
| `/data/adb/certbridge/cb`             | CLI 入口（推荐）   |
| `/data/adb/modules/CertBridge/bin/cb` | 模块内入口（兼容） |
| `.../bin/cert_manager.sh`             | 实际命令实现       |
| `.../config/certs.conf`               | 主配置             |
| `.../data/install.log`                | 安装与运行日志     |

多行白名单更适合用 WebUI 编辑；完整键义见 [配置说明](/guide/config)。
