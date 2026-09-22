# Features

**CertBridge** (module ID `CertBridge`) runs on Magisk, KernelSU, and APatch. Boot scripts and optional components do the actual work; the WebUI and CLI are interfaces for configuration and diagnostics.

**Download:** [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases) (`*_arm64.zip`, `*_arm32.zip`, `*_x86.zip`, `*_x64.zip`, or `*_lite.zip`) → [Installation](./install)

## Components

| Component                        | Purpose                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Magisk module                    | `post-fs-data` / `service`: merges CAs, binds trust stores, and optionally performs late injection |
| WebUI (optional)                 | Home, Certificates, Logs, Hide, and More pages inside a supported root manager                     |
| Reboot-free hot mount (optional) | Temporarily injects CAs from user credentials or shared storage; disappears after reboot           |
| Mount-hide assistance (optional) | Registers `try_umount` rules with SuSFS, `ksud`, or NoHello; installed by default but disabled     |
| Zygisk filter (optional)         | Filters this module's lines from mountinfo/maps inside target processes; not installed by default  |
| CLI                              | `bin/cb` invokes `cert_manager.sh` (`help`, `status`, `set`, and more)                             |

## Core: system CA injection

At each boot, CertBridge:

1. Reads the complete `hash.N` set from live system and Conscrypt APEX trust stores that are not already mounted by CertBridge.
2. Adds enabled Reqable, ProxyPin, custom, and other add-on certificates.
3. Validates the result, then bind-mounts the **complete** certificate set onto the trust-store paths in compatible mode.

CertBridge does **not** save a baseline copy of the system CAs or modify system-partition files. If the live source contains too few certificates, copying is incomplete, or an add-on fails validation, that injection is abandoned and the original system store remains untouched.

## Certificate sources

| Source                      | Behavior                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Reqable                     | Read from the installed app; no sample CA is bundled. Can be toggled and resynced at boot or refresh                      |
| ProxyPin                    | Prefer the installed app's CA; if none is detected and ProxyPin was enabled during installation, use the bundled fallback |
| HttpCanary / ADGuard        | May be offered for import as **custom** certificates during installation or detected on refresh                           |
| Custom                      | Upload PEM/DER in WebUI or place files in `certs/custom/`; names come from certificate subjects                           |
| User store / shared storage | Temporary only and requires the hot-mount component; see [Configuration: Hot mount](./config#hot-mount)                   |

## Mount modes

| Mode                        | Description                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Compatible** `compatible` | Default. Merges and binds the complete store at runtime; does not require a Magic Mount meta-module                                   |
| **Lite Magic** `magic`      | Overlays add-ons through `system/` only; Magisk normally supports this, while KernelSU setups must verify that the overlay is correct |

On Android 14+, `experimental_14_system=skip` is the default: scripts bind the **primary APEX** and skip the system path to reduce traces. See [Configuration: Mount modes](./config#mount-modes).

## Mount hiding at a glance

Detectors may inspect `mountinfo`, path names, or trust-store contents. CertBridge provides two optional, complementary mechanisms:

| Mechanism              | Effect                                                             | Default installation            |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------- |
| SuSFS / kernel unmount | Removes CertBridge mounts for apps configured to “unmount modules” | Component installed, switch off |
| Zygisk mount filtering | Filters CertBridge mount/maps lines inside selected processes      | Not installed                   |

Never enable module unmounting for the capture path, or the capture tool may report “root certificate not installed” and targets may lose connectivity. See [Mount hiding](./hide).

## Conservative experimental defaults

These options are off by default to minimize traces. Enable them under **Hide → Advanced experiments** only when certificate injection is incomplete:

| Key                  | Meaning while disabled                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| `late_inject`        | Inject only at boot; do not repair app namespaces from the service                |
| `boot_bind_zygote`   | Bind only in init at boot; do not enter the zygote namespace                      |
| `boot_multi_apex`    | On Android 14+, bind only the primary APEX and skip versioned APEX/system targets |
| `service_probe`      | No backoff verification or delayed healing; only relevant with `late_inject=1`    |
| `force_bind_capture` | Respect “unmount modules” instead of force-binding Reqable/ProxyPin               |

## Interfaces

- [WebUI](./webui)
- [Command-line interface](./cli)
- [Mount hiding](./hide)

## Typical uses

| Scenario                                    | Recommendation                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| System-wide capture with Reqable / ProxyPin | Default installation, reboot, then verify matching fingerprints        |
| Android 14+ APEX trust store                | Start with compatible mode; enable experiments only if CAs are missing |
| Reduce mount-detection exposure             | Install and enable hide assistance; optionally add Zygisk filtering    |
| Minimize package size                       | Flash the Lite package, which omits OpenSSL                            |
| Temporarily test a user-store CA            | Use hot mount; use custom import for permanent installation            |

## What CertBridge does not do

- It does not provide a traffic-capture proxy; use Reqable, ProxyPin, or another proxy.
- It does **not** modify SELinux policy files (it only applies `chcon` to temporary certificate directories).
- It does not permanently move user-credential certificates into the module.
- It does not bundle a sample Reqable certificate.

## Path reference

```text
/data/adb/modules/CertBridge/
/data/adb/modules/CertBridge/config/certs.conf
/data/adb/modules/CertBridge/config/zn_whitelist.txt   # when Zygisk filtering is installed
/data/adb/modules/CertBridge/bin/cb
/data/adb/modules/CertBridge/data/install.log
/data/adb/certbridge/                                  # short-lived external update files, etc.
```
