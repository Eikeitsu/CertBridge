# 配置说明

## certs.conf

路径：`/data/adb/modules/CertBridge/config/certs.conf`

```text
schema_version=2
reqable=1
proxypin=1
```

| 键               | 含义                       | 默认 |
| ---------------- | -------------------------- | ---- |
| `schema_version` | 配置结构版本，请勿手动修改 | `2`  |
| `reqable`        | 启用内置 Reqable CA        | `1`  |
| `proxypin`       | 启用内置 ProxyPin CA       | `1`  |

也可在 WebUI「证书」页用开关修改。内置开关和自定义永久证书仍在重启后生效，避免重写正在使用的开机证书层。

![证书页](/screenshots/webui-certs.png)

## 安装组件记录

安装脚本会生成 `config/install-profile.conf`，记录默认/自定义安装方式，以及是否安装 WebUI 和免重启热挂载组件。选择不安装 WebUI 不影响开机证书注入；选择不安装热挂载后，`bin/hot_mount.sh` 不会保留在设备模块目录中，WebUI 也会自动隐藏对应区域。

## 自定义证书

1. WebUI 支持 PEM / DER 证书，文件不必预先改名
2. 设备必须提供 OpenSSL，模块会检查 X.509、有效期和 `CA:TRUE`
3. 模块自动计算 `subject_hash_old`，并在冲突时分配 `.1`、`.2` 等序号
4. 单个文件最大 64 KiB，保存后重启生效

## 临时免重启挂载

此功能仅在安装时选择“默认安装”或在自定义安装中明确启用后可用。

- **用户证书**：读取所有用户的 `/data/misc/user/*/cacerts-added/`
- **存储卡证书**：默认递归扫描 `/sdcard/CertBridge`，也可在 WebUI 指定 `/sdcard/`、`/storage/emulated/` 或 `/mnt/media_rw/` 下的目录
- **合并挂载**：同时加入用户区与存储卡证书
- **无痕卸载**：只卸载带当前 CertBridge 会话标记的挂载层，永久配置不变

临时导入同样执行 X.509、有效期、`CA:TRUE`、64 KiB 和 subject hash 校验，单次最多处理 128 张有效证书。临时会话重启后自动失效。

::: warning 用户与工作资料隔离
「用户证书」会把所有 Android 用户及工作资料中的 CA 临时提升为全局系统信任。只应在你确认这些证书均可信时使用；需要更小范围时，请把指定证书放入独立存储卡目录并选择「挂载存储卡证书」。
:::

## 日志

`data/install.log` — WebUI「日志」页可查看 / 清空。
