# Configuration

WebUI is the recommended way to change settings. You can also use `bin/cb set` / `cb get`, or edit the files directly.

| File                          | Contents                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `config/certs.conf`           | Certificate switches, mount mode, hot mount, hiding, and advanced experiments |
| `config/zn_blacklist.txt`     | Zygisk filter blacklist (`zn_filter_mode=blacklist`)                          |
| `config/zn_whitelist.txt`     | Zygisk filter whitelist (`zn_filter_mode=whitelist`)                          |
| `config/install-profile.conf` | Read-only record of components selected at installation                       |
| `data/state/`                 | Runtime caches and hide-assistance state                                      |

These paths are relative to `/data/adb/modules/CertBridge/`.

## Common `certs.conf` settings

```text
schema_version=4
reqable=1
proxypin=1
mount_mode=compatible
experimental_14_system=skip
tmpfs_style=dev
quiet_prop=0
hot_allow=1
force_bind_capture=0
late_inject=0
boot_bind_zygote=0
boot_multi_apex=0
service_probe=0
```

When the corresponding components are installed, these may also appear:

| Key                 | Meaning                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `hide_allow`        | `1` enables SuSFS/kernel `try_umount` registration                                             |
| `zn_hide_allow`     | `1` enables Zygisk mount filtering (CertBridge path traces only by default)                    |
| `zn_filter_mode`    | `blacklist` (default) or `whitelist`                                                           |
| `zn_hide_anon_exec` | For filter targets: **on by default** (hide `[anonymous]` trampoline maps); set `0` to disable |

### Certificate switches

| Key        | Default | Meaning                                                 |
| ---------- | ------- | ------------------------------------------------------- |
| `reqable`  | `1`     | Enable the Reqable CA imported from the app             |
| `proxypin` | `1`     | Enable the ProxyPin CA from the app or bundled fallback |

After changing these switches, reboot in normal use (or follow the hot-mount prompt) for the change to take full effect.

## Mount modes {#mount-modes}

Choose a mode during custom installation or under WebUI **More → Mount mode**. A reboot is required. Default installation always selects compatible mode.

| Mode                        | Android 7–13                                        | Android 14+ with default `experimental_14_system=skip`                            |
| --------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Compatible** `compatible` | Script binds a complete merged system cacerts store | Script binds **APEX** and skips system                                            |
| **Lite Magic** `magic`      | Magic Mount overlays add-ons only; no script bind   | Script binds **APEX**, skips system, and overlays add-ons only when set to `auto` |

### Compatible mode (default)

- Merges the full system store and add-ons into tmpfs at boot, then `bind` mounts it onto each target.
- Does not write an overlay directory under the module's `system/`, avoiding an empty directory hiding the complete store.
- Does **not** require a Magic Mount meta-module.

### Lite Magic mode

- Writes enabled add-ons as `hash.N` files under `system/etc/security/cacerts/`.
- Magisk normally provides the required file overlay.
- On KernelSU, verify that the overlay is correct. If a whole-directory replacement leaves only a handful of CAs and causes widespread TLS failures, switch back to compatible mode immediately and reboot.

### Magic Mount meta-modules {#magic-mount-meta}

A “meta-module” is the manager-side layer that overlays module `system/` onto real system paths (built into Magisk; KernelSU/APatch vary or need extras). It is **not** the same as hide helpers such as SuSFS or ZygiskNext.

| Root     | Compatible                  | Lite Magic                                                               |
| -------- | --------------------------- | ------------------------------------------------------------------------ |
| Magisk   | Script bind; no meta-module | Built-in overlay is usually enough                                       |
| KernelSU | Script bind; no meta-module | Needs kernel/manager Magic Mount; full-dir replace can wipe the CA store |
| APatch   | Script bind; no meta-module | Depends on manager overlay; switch back to Compatible if broken          |

The WebUI mount panel under **More → Mount & inject** shows the same summary. Hide-related notes live on [Mount hiding](./hide).

### `experimental_14_system`

This setting applies only to Android 14+:

| Value  | Meaning                                                                                    |
| ------ | ------------------------------------------------------------------------------------------ |
| `skip` | Default: do not process system; script-bind APEX only                                      |
| `auto` | Also process system according to `mount_mode` (`compatible` binds it; `magic` overlays it) |

Together with the default `boot_multi_apex=0`, CertBridge binds only the **primary** APEX and skips versioned `@...` APEX paths and system, reducing traces. Set `boot_multi_apex=1` to use the complete target list while still respecting both mount-mode settings.

## Temporary-layer path: `tmpfs_style`

| Value    | Example location                 |
| -------- | -------------------------------- |
| `dev`    | `/dev/.fs*` (default)            |
| `mnt`    | `/mnt/.ca*`                      |
| `short`  | A short name under `local/tmp`   |
| `legacy` | Historical `sys-ca-merge*` style |

Changing this path does not replace unmount-based hiding; see [Mount hiding](./hide).

## Other behavior

| Key                  | Default | Meaning                                                                                                            |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `quiet_prop`         | `0`     | `0` writes a runtime status label in the manager list (default); `1` keeps a neutral description                   |
| `hot_allow`          | `1`     | Permit WebUI/Action to start temporary hot mounts when the component is installed                                  |
| `force_bind_capture` | `0`     | `1` force-injects Reqable/ProxyPin namespaces; default respects “unmount modules”                                  |
| `late_inject`        | `0`     | `1` revisits app namespaces after `boot_completed`; improves difficult-device compatibility but leaves more traces |
| `boot_bind_zygote`   | `0`     | `1` enters zygote at boot; default binds init only                                                                 |
| `boot_multi_apex`    | `0`     | `1` uses the full dual-mode target list; default binds only the primary APEX on Android 14+                        |
| `service_probe`      | `0`     | With `late_inject=1`, enables backoff verification and delayed healing                                             |

Advanced options are under WebUI **Hide → Advanced experiments**.

## Hot mount {#hot-mount}

This requires the hot-mount component and `hot_allow=1`.

| Type           | Behavior                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------- |
| User store     | Reads user-credential CAs and injects them into the system trust store without rebooting     |
| Shared storage | Scans a directory, commonly a `cacerts` folder under Documents; CLI accepts an explicit path |
| Clean unmount  | Removes only the temporary session without changing permanent configuration                  |

The temporary layer also merges all currently enabled permanent add-ons so it does not hide Reqable or ProxyPin. It disappears after reboot. CLI commands are `cb hot_mount` and `cb hot_unmount`.

## Zygisk black / white lists

`zn_filter_mode` selects which file applies (the two lists are not mixed):

| Mode                  | File                      | Listed apps      | Empty list                               |
| --------------------- | ------------------------- | ---------------- | ---------------------------------------- |
| `blacklist` (default) | `config/zn_blacklist.txt` | **Filtered**     | Filter no apps                           |
| `whitelist`           | `config/zn_whitelist.txt` | **Not filtered** | Filter almost all (capture still exempt) |

One package per line (`:process` ok); `#` comments. Capture apps are always exempt.

Edit mode and the active list on the Hide page. Force-stop apps after saving. CLI: `cb set_zn_filter_mode`, `get|set_zn_blacklist`, `get|set_zn_whitelist`.

## Related documentation

- [Mount hiding](./hide) — SuSFS, Zygisk, and root-solution guidance
- [Command-line interface](./cli) — `cb set`, `cb status`, and related commands
- [FAQ](./faq)
