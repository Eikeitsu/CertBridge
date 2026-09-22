# Installation and upgrades

::: tip Download the module
Official packages are published only on [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases).

Use `CertBridge_v*_arm64.zip` for most physical devices, or choose arm32/x86/x64 for the matching architecture. Choose `*_lite.zip` only when package size matters. Do not look for installation zips in Issues, Discussions, or the documentation site.
:::

## Requirements

- Magisk, KernelSU (including SukiSU), APatch, or a compatible root solution
- Android 7.0+ (API 24+); Android 14+ uses APEX injection
- For WebUI, a manager that supports module web pages, such as KernelSU, SukiSU, APatch-family managers, MMRL, or WebUI-X

## Which package should I download?

1. **Most users with arm64 phones:** `CertBridge_v*_arm64.zip`, the full build containing arm64 OpenSSL. In-manager updates also use this package.
2. **Other architectures:** use `*_arm32.zip`, `*_x86.zip`, or `*_x64.zip`.
3. **Smallest package:** use `CertBridge_v*_lite.zip`, which replaces OpenSSL with an approximately 8 KB `cbx509` dex. It has the same module ID (`CertBridge`), so do not install both; flash over the existing module to switch.

## Release files

| File                      | Contents                                                 | Intended use                                                        |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| `CertBridge_v*_arm64.zip` | Full build with arm64 OpenSSL and matching Zygisk binary | **Recommended** for most phones                                     |
| `CertBridge_v*_arm32.zip` | Full build for armeabi-v7a                               | 32-bit ARM devices                                                  |
| `CertBridge_v*_x86.zip`   | Full build for x86                                       | x86 emulators                                                       |
| `CertBridge_v*_x64.zip`   | Full build for Android x86_64                            | x86_64 emulators                                                    |
| `CertBridge_v*_lite.zip`  | `cbx509` dex, no OpenSSL                                 | Size-sensitive installs; app-CA import from recovery may be limited |

Notes:

- `updateJson` always points to the full arm64 release.
- After reboot, Lite users can add certificates through WebUI or `certs/custom/`.
- A release may include the matching `zygisk/*.so`; custom installation reports a missing component when no binary was built.
- To build the legacy multi-architecture package locally, run `PACKAGE_FAT=1 npm run package:module`.

## Installation

1. Download one zip from [Releases](https://github.com/Eikeitsu/CertBridge/releases).
2. Flash it in your root-module manager.
3. Within **20 seconds**, use the volume keys to choose an installation profile.
4. **Reboot.**
5. Open WebUI or inspect the module description to verify status.

### Default installation: Volume Up or timeout

| Item                  | Behavior                                                                               |
| --------------------- | -------------------------------------------------------------------------------------- |
| Reqable / ProxyPin    | Detect app CAs automatically; use ProxyPin's bundled fallback only if no app CA exists |
| WebUI                 | Installed                                                                              |
| Hot mount             | Installed                                                                              |
| Mount-hide assistance | **Installed**, with `hide_allow` **off** by default                                    |
| Zygisk filter         | **Not installed**                                                                      |
| Mount mode            | Fixed to **compatible**                                                                |

### Custom installation: Volume Down

The installer asks about Reqable, ProxyPin, WebUI, hot mount, mount-hide assistance, the **Zygisk mount-trace filter**, and compatible versus Lite Magic mount mode.

| Selected component    | Initial switch state                             |
| --------------------- | ------------------------------------------------ |
| Mount-hide assistance | `hide_allow=1`; it can be disabled in WebUI      |
| Zygisk filter         | `zn_hide_allow=1`; requires Zygisk to be enabled |

If **HttpCanary** or **ADGuard** is detected, the installer may also offer to import its CA as a custom certificate.

For unattended installation, create `/data/adb/certbridge/install_auto`. The installer skips volume-key selection and uses the default profile; remove the marker afterward.

### Action button

- **Volume Up** or timeout: refresh and synchronize state.
- **Volume Down:** mount or unmount temporary CAs when the hot-mount component is installed.

## Online updates

`module.prop` points `updateJson` to the documentation site's stable channel. Under WebUI **More**, you can select the **stable** or **CI** channel; CI packages come from the `ci-dist` branch and are intended for early testing.

An upgrade attempts to preserve `certs.conf`, custom certificates, old `certs/sources` data, and `data/state` snapshots, migrating applicable data to `/data/adb/certbridge/`. Installed optional components follow the choices made during the current flash.

## Hot updates

Supported managers and WebUI can update CertBridge without an immediate reboot. `/data/adb/certbridge/` holds temporary update files, `user.conf` switches, and certificate working/shutdown snapshots. A failed hot update falls back to the standard reboot-required path. WebUI and CLI scripts take effect immediately after a successful hot update.

## Device layout

```text
/data/adb/certbridge/            # outside the module
├── user.conf / addon-sources / …
└── cb                           # recommended CLI entry

/data/adb/modules/CertBridge/
├── module.prop / post-fs-data.sh / service.sh / action.sh
├── bin/                         # core, injection, manager, optional hot/hide/openssl or cbx509
├── certs/
│   ├── builtin/                 # ProxyPin fallback only
│   ├── sources/                 # legacy path; migrated at startup
│   ├── custom/                  # user-provided certificates
│   ├── generation/              # complete set generated for this boot
│   └── hot/                     # temporary session, removed on unmount
├── config/certs.conf
├── config/zn_whitelist.txt      # when the Zygisk component is installed
├── zygisk/                      # optional *.so
├── data/state/                  # applied list and runtime state
└── webroot/                     # optional WebUI
```

## Uninstallation

After removing the module in your manager, you **must reboot**. The uninstall script tries to end the current hot-mount session, but deliberately does not tear down permanent boot-time CA mounts because doing so could damage another certificate module's overlay. Rebooting performs the final cleanup.
