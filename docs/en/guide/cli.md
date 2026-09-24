# Command-line interface

After installation, open a root shell with `adb shell` / `su`:

```bash
/data/adb/certbridge/cb help
/data/adb/certbridge/cb status
```

The external `/data/adb/certbridge/cb` entry forwards to the module's `cert_manager.sh`. The module-local `bin/cb` remains supported. CertBridge does **not** install this command into `system/bin`.

## Common commands

| Command / alias                             | Purpose                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `help` / `-h`                               | Help; accepts topics such as `set`, `get`, `hot`, and `hide`           |
| `status` / `st` [`--live`]                  | Show status; `--live` performs a live check and saves the result       |
| `verify` / `v`                              | Equivalent to `status --live`                                          |
| `get` / `g` `<key>`                         | Read one configuration key                                             |
| `set` `<key>` `<value>`                     | Write through the common validator and apply key-specific side effects |
| `toggle` / `t` `reqable\|proxypin` `0\|1`   | Toggle a certificate source                                            |
| `sync_apps` / `sa`                          | Resynchronize built-in sources from installed apps                     |
| `list_custom` / `ls`                        | List custom certificates                                               |
| `list_applied_fps` / `lf`                   | List applied fingerprints                                              |
| `cert_info` / `info` `<target>`             | Show certificate details                                               |
| `install_custom` / `ic` `<base64>`          | Install a custom certificate; used by WebUI                            |
| `import_app_preset` / `ip` `<name>`         | Import a known app path                                                |
| `remove_custom` / `rm` `<file>`             | Remove a custom certificate                                            |
| `hot_mount` / `hm` `user\|sd\|all` `[path]` | Start a temporary hot mount                                            |
| `hot_unmount` / `hu`                        | End the temporary session                                              |
| `set_hide_allow` / `hide` `0\|1`            | Toggle mount-hide assistance                                           |
| `hide_reregister` / `hr`                    | Immediately register `try_umount` paths again                          |
| `set_zn_hide_allow` / `zn` `0\|1`           | Toggle Zygisk filtering                                                |
| `get_zn_whitelist` / `gzn`                  | Read the Zygisk whitelist                                              |
| `set_zn_whitelist` / `szn` `<base64>`       | Write the whitelist                                                    |

The old `reinject` and `sync` commands are disabled and report that a reboot is required because hot reloading is no longer supported.

## Keys accepted by `set`

```bash
cb set <key> <value>
# or:
cb help set
```

| Key                                                                                         | Allowed values                     |
| ------------------------------------------------------------------------------------------- | ---------------------------------- |
| `mount_mode`                                                                                | `compatible` or `magic`            |
| `experimental_14_system`                                                                    | `auto` or `skip`                   |
| `tmpfs_style`                                                                               | `dev`, `mnt`, `short`, or `legacy` |
| `quiet_prop`, `hot_allow`, `hide_allow`, `zn_hide_allow`                                    | `0` or `1`                         |
| `force_bind_capture`, `late_inject`, `boot_bind_zygote`, `boot_multi_apex`, `service_probe` | `0` or `1`                         |
| `reqable`, `proxypin`                                                                       | `0` or `1`; equivalent to `toggle` |

Hide and Zygisk settings require their corresponding installed components. Otherwise, commands return errors such as `zn_hide_feature_not_installed`.

## Examples

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

## Related paths

| Path                                  | Purpose                       |
| ------------------------------------- | ----------------------------- |
| `/data/adb/certbridge/cb`             | Recommended CLI entry         |
| `/data/adb/modules/CertBridge/bin/cb` | Compatible module-local entry |
| `.../bin/cert_manager.sh`             | Command implementation        |
| `.../config/certs.conf`               | Main configuration            |
| `.../data/install.log`                | Installation and runtime log  |

WebUI is more convenient for editing a multiline whitelist. See [Configuration](./config) for complete key semantics.
