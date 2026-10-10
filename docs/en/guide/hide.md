# Mount hiding

CertBridge **bind-mounts** the merged CA into system trust-store paths. Detectors may still see anomalies via `mountinfo`, path fingerprints, or trust-store contents.

- **Changing the temporary layer path ≠ hiding**: `tmpfs_style` alone does not replace umount
- **Kernel-side unmount**: SuSFS / `ksud` / NoHello try_umount helpers
- **In-process table views**: optional Zygisk filtering strips CertBridge-related lines

These two capabilities are **parallel and not substitutes**.

## Capture must-read

For the certificate to work, the process must see the cacerts **bind**. Enabling “Unmount modules / Umount / DenyList+umount / Exclude modifications” for an app also removes the certificate layer from that process’s mount namespace.

| Target                  | If umount is enabled                         | Typical symptom                             |
| ----------------------- | -------------------------------------------- | ------------------------------------------- |
| Reqable / ProxyPin etc. | Cannot read capture CA from the system store | In-app “**root certificate not installed**” |
| Capture target app      | TLS cannot see the capture CA                | **Offline** / certificate errors            |

**Correct approach**: only enable module unmount for apps that need to evade detection and are **not** part of the current capture session; never for capture tools or the target app.

## Hide assistance (SuSFS / kernel)

| Install mode | Component           | Default `hide_allow`               |
| ------------ | ------------------- | ---------------------------------- |
| Default      | **Installed**       | **Off** (`0`; toggle on Hide page) |
| Custom       | Volume-key optional | On after check (`1`)               |

When missing: no assist scripts on device; if Zygisk filtering is also missing, WebUI **hides the Hide tab**.

When installed:

- Hide page switch (`hide_allow`)
- On: successful inject / hot-mount registers with SuSFS, `ksud kernel umount`, NoHello, etc.
- Off: clears registration immediately (with `ksud`, `umount del` for known paths; **no** full wipe)
- Switch writes conf and returns; registration runs in the background
- To verify unmount: **force-stop and reopen** the target app

Without helpers, bind mounts may still appear in mountinfo. The page lists available SuSFS / ksud / NoHello / ZygiskNext assistants (can coexist).

## Zygisk mount-trace filtering {#zygisk-mount-trace-filtering}

Packages may include `zygisk/<abi>.so`. **Not installed by default**; custom install can select it and starts with `zn_hide_allow=1`.

| Track            | Tech                             | Scope                                   | Packaging                                                       |
| ---------------- | -------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| **A (primary)**  | Classic Zygisk `zygisk/*.so`     | Only apps on the **filter target list** | Shipped when `.so` exists                                       |
| **B (optional)** | ZN Module: `zn_modules.txt` + so | Init-started service processes          | Only when `zn_modules.txt` has active lines and the so is built |

When enabled (and the process is on the target list), process-visible tables drop **this module’s** traces, e.g.:

- `mountinfo` / `mounts` lines containing `CertBridge`, `sys-ca-merge`, `/dev/.fs*`, `/mnt/.ca*`, etc.
- `maps` / `smaps` lines mapped to this module’s `zygisk/*.so` or the temporary layer
- `readlink` to module paths appears as missing

**Does not unmount or change trust-store contents**: the cacerts bind remains; HTTPS still uses the module CA. Complements Root “unmount modules”—only the latter removes the overlay from the namespace.

| Item          | Notes                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Config        | `zn_hide_allow`; `zn_filter_mode`; `zn_hide_anon_exec` off by default                                                                                                          |
| List mode     | **Blacklist (default)**: filter only `zn_blacklist.txt`; empty = filter none. **Whitelist**: skip `zn_whitelist.txt`; empty ≈ filter all (careful). Capture apps always exempt |
| Not installed | No `.so` → `zn_hide_supported=0`                                                                                                                                               |

> Putting detection apps on the blacklist is intended (filter this module’s table traces for those targets). Non-targets get `DLCLOSE` so the module so does not linger in maps and trip detectors; targets keep the so and self-hide via filtered reads. Force-stop apps after list changes.  
> **Filter ≠ module umount**: the former keeps the CA; the latter tears down mounts.

### Path fingerprints (with filtering)

Script inject copies certs to a short tmpfs path (default `/dev/.fs0`) then bind-mounts, and orphans the staging mount afterward so mountinfo does not keep pointing at the module tree. If you still see `modules/CertBridge`, that is often **Magic Mount**—prefer `mount_mode=compatible` + `tmpfs_style=dev`, then add packages to the blacklist as needed.

## By Root solution

### KernelSU / SukiSU

1. Enable **Unmount modules** only for apps that need evasion
2. **Do not** enable for Reqable / ProxyPin / capture targets
3. With SuSFS, `hide_allow=1` auto `add_try_umount`
4. For in-process mountinfo filtering, install Zygisk filtering + a compatible loader, then add packages to the target list

### Magisk

1. DenyList / Shamiko / Zygisk umount: same rule—keep capture path off unmount lists
2. ZygiskNext / ReZygisk / NeoZygisk (often disable built-in Zygisk)
3. NoHello / Zygisk Assistant: `hide_allow=1` can write cacerts `point` rules
4. Magisk has no official `ksud kernel umount` equivalent

### APatch

1. Enable **Exclude modifications** only for evasion targets
2. Do not enable for the capture path
3. NeoZygisk / ReZygisk / ZygiskNext; or NoHello assist

## WebUI Hide page

| Area        | Content                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| Status      | Root, mount mode, stage path, assistants, registration                             |
| Hide assist | `hide_allow`, re-register now                                                      |
| Zygisk      | `zn_hide_allow`, black/white list mode; “Pick apps” into the list (when installed) |
| Note        | “Filter ≠ module umount”                                                           |
| Checklist   | Dismissible capture reminder                                                       |
| Experiments | Force-bind / late inject / zygote / multi-APEX / service probe                     |

See [WebUI](./webui) and [Configuration](./config).

## Capability matrix

| Capability             | Entry                                                       | Notes                                                  |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| SuSFS / kernel unmount | Component + `hide_allow`                                    | Unmounts for apps on the manager umount list           |
| Zygisk filter          | Custom install + `zn_hide_allow` + `zn_filter_mode` + lists | Filters this module’s mount/maps lines per mode        |
| Short stage path       | `tmpfs_style`                                               | Reduces path fingerprints; **not** a umount substitute |
| Experiments            | All off by default                                          | Enable only when diagnosing certificate issues         |
