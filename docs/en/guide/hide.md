# Mount hiding

CertBridge uses **bind mounts** to place the merged CA set on Android trust-store paths. A detector may still find those changes through `mountinfo`, path patterns, or trust-store contents.

- Changing the temporary path is **not hiding**: `tmpfs_style` cannot replace unmounting.
- Kernel-side unmounting relies on SuSFS, `ksud`, NoHello, or another `try_umount` implementation.
- The optional Zygisk filter removes relevant lines from process-visible mount and maps files.

These mechanisms are complementary; neither replaces the other.

## Required reading for traffic capture

For a CA to work, the process must see the cacerts **bind mount**. Enabling “unmount modules,” DenyList unmounting, or “exclude modifications” for an app removes that certificate layer from the app's mount namespace.

| App                                        | Result when unmounting is enabled                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Reqable, ProxyPin, or another capture tool | Cannot see its capture CA in the system store and reports **“root certificate not installed”** |
| The target app being captured              | TLS cannot see the capture CA, causing certificate errors or loss of networking                |

Enable unmounting only for apps that must avoid detection and are **not participating in the current capture**. Keep it disabled for both the capture tool and every target app.

## Mount-hide assistance: SuSFS/kernel

| Installation profile | Component                 | Initial `hide_allow`                                 |
| -------------------- | ------------------------- | ---------------------------------------------------- |
| Default              | **Installed**             | **Off** (`0`); enable it on WebUI's Hide page        |
| Custom               | Selected with volume keys | **On** (`1`) when selected; it can be disabled later |

When omitted, no helper script remains on the device. If the Zygisk filter is also omitted, WebUI does not show the Hide page.

When installed:

- WebUI's Hide page controls `hide_allow`.
- After successful injection or hot mount, the helper registers paths with SuSFS, `ksud kernel umount`, NoHello, and supported alternatives.
- Disabling it clears registrations immediately. With `ksud`, it deletes known paths and does **not** wipe the whole table.
- The switch writes configuration and returns immediately; registration continues in the background without blocking WebUI.
- To verify unmounting, force-stop and reopen the target app. Rebooting solely to register paths is unnecessary.

Without a helper, detectors may still see the bind in mountinfo. The Hide status card lists available helpers side by side (SuSFS, ksud, NoHello, ZygiskNext, and so on)—they can work together; there is no exclusive priority. CertBridge registers paths itself via `ksud kernel umount` / `ksu_susfs add_try_umount`.

## Zygisk mount-trace filtering

Release packages may contain `zygisk/<abi>.so`. It is **not installed by default**, but custom installation can select it and starts with `zn_hide_allow=1`.

| Track             | Technology                                  | Scope                                              | Packaging                                        |
| ----------------- | ------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| **A (primary)**   | Classic Zygisk API via `zygisk/*.so`        | Filters mount/maps views in ordinary app processes | Shipped when the binary is available             |
| **B (auxiliary)** | ZN Module via `zn_modules.txt` and an `.so` | Services launched by init                          | No placeholder package; omitted until calibrated |

| Item          | Details                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Filtering     | Line-by-line filtering for mountinfo/mounts and maps/smaps; reduces `map_files` readlink exposure |
| Setting       | `zn_hide_allow`, independent of `hide_allow`                                                      |
| Requirement   | Zygisk built in or supplied by ZygiskNext, ReZygisk, NeoZygisk, or another compatible loader      |
| Whitelist     | `config/zn_whitelist.txt`; capture apps are included by default and are not filtered              |
| Not installed | No `.so` means `zn_hide_supported=0`; Hide appears only if this or hide assistance exists         |

The shared object remains in memory, and PLT hooks or the Zygisk framework itself may still be detectable. Filtering is not complete invisibility.

## Guidance by root solution

### KernelSU / SukiSU

1. Enable **Unmount modules** only for apps that need detection resistance.
2. Never enable it for Reqable, ProxyPin, or target apps being captured.
3. With SuSFS, `hide_allow=1` automatically calls `add_try_umount`.
4. For in-process mountinfo filtering, install the Zygisk component and a compatible loader.

### Magisk

1. When using DenyList, Shamiko, or Zygisk unmounting, keep the complete capture path outside the unmount list.
2. ZygiskNext, ReZygisk, or NeoZygisk can be used; they often require disabling built-in Zygisk.
3. With NoHello or Zygisk Assistant, `hide_allow=1` can register cacerts `point` rules.
4. Magisk has no official equivalent of `ksud kernel umount`; script binds depend on those helpers or Zygisk filtering.

### APatch

1. Enable **Exclude modifications** only for apps that need it.
2. Do not enable it for capture tools or targets.
3. NeoZygisk, ReZygisk, ZygiskNext, or NoHello may provide the supporting mechanisms.

## WebUI Hide page

| Section              | Contents                                                                              |
| -------------------- | ------------------------------------------------------------------------------------- |
| Live status          | Root solution, mount mode, temporary layer, detected helpers, and registration status |
| Hide assistance      | `hide_allow` and immediate re-registration                                            |
| Zygisk               | `zn_hide_allow` and whitelist editor when installed                                   |
| Capture checklist    | A dismissible warning card                                                            |
| Advanced experiments | Force binding, late injection, zygote, multi-APEX, and service probing                |

See [WebUI](./webui) and [Configuration](./config).

## Capability summary

| Capability           | Entry point                             | Key point                                                          |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| SuSFS/kernel unmount | Install helper and set `hide_allow`     | Removes mounts for apps on the root manager's unmount list         |
| Zygisk filtering     | Custom installation and `zn_hide_allow` | Filters CertBridge mount/maps lines seen by processes              |
| Short temporary path | `tmpfs_style`                           | Reduces path fingerprints but does **not** replace unmounting      |
| Advanced experiments | All off by default                      | Enable compatibility options only when certificate injection fails |
