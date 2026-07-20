# 配置说明

## certs.conf

路径：`/data/adb/modules/CACertStore/config/certs.conf`

```text
reqable=1
proxypin=1
auto_reinject=1
```

| 键 | 含义 | 默认 |
|----|------|------|
| `reqable` | 启用内置 Reqable CA | `1` |
| `proxypin` | 启用内置 ProxyPin CA | `1` |
| `auto_reinject` | 开机后 `service.sh` 再注入一次 | `1` |

也可在 WebUI「证书」页用开关修改，保存后会同步并尝试注入。

## 自定义证书

1. 文件名必须是 **8 位十六进制 + `.0`**（OpenSSL `subject_hash_old`）
2. WebUI 上传，或手动放入 `certs/custom/`
3. 执行同步 / 重启后生效

电脑上计算 hash：

```bash
openssl x509 -inform PEM -subject_hash_old -in your.crt | head -1
# 将证书重命名为 <hash>.0
```

## 日志

`data/install.log` — WebUI「日志」页可查看 / 清空。
