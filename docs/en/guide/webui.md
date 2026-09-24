# WebUI

Open WebUI inside a supported module manager such as KernelSU, SukiSU, an APatch-family manager, MMRL, or WebUI-X. The bottom navigation contains **Home · Certificates · Logs · More** and adds **Hide** when mount-hide assistance and/or Zygisk filtering is installed.

The unified Trust Signal design supports light, dark, and system themes plus an accent color.

## Preview

|                   Home                   |                 Certificates                  |
| :--------------------------------------: | :-------------------------------------------: |
| ![Home](/screenshots/webui-overview.svg) | ![Certificates](/screenshots/webui-certs.svg) |

|                Logs                 |                 Hide                 |                 More                 |
| :---------------------------------: | :----------------------------------: | :----------------------------------: |
| ![Logs](/screenshots/webui-log.svg) | ![Hide](/screenshots/webui-hide.svg) | ![More](/screenshots/webui-more.svg) |

The matching files under `docs/public/screenshots/` can be replaced to update these previews.

## Opening WebUI

1. Use the default installation profile, or select WebUI during custom installation.
2. After reboot, open **CertBridge → WebUI** in your manager.
3. The manager must provide a shell bridge; an ordinary browser cannot host this WebUI.

If the bridge is not detected, use a client that supports module WebUIs.

## Home

Home answers one question: “Is trust injection working?”

| Section             | Contents                                                                               |
| ------------------- | -------------------------------------------------------------------------------------- |
| Status stage        | Overall state, applied-certificate summary, refresh/verify action, and reboot guidance |
| Metrics             | Enabled, custom, and baseline certificate counts                                       |
| Built-in chips      | Reqable and ProxyPin state                                                             |
| Environment details | Collapsible device, Android, root, injection, mount-mode, and version information      |

Mount and hide details are on the [Hide page](./hide).

### Refresh and verify

This action:

1. Tries to synchronize current CAs from enabled Reqable/ProxyPin apps, skipping unchanged fingerprints.
2. Performs a forced live injection check equivalent to `status --live` and updates cached state.
3. Reloads the custom-certificate list.

After boot, a brief “stabilizing” state may trigger a silent verification. You can also refresh manually.

## Certificates

| Section          | Contents                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Built-in sources | Reqable/ProxyPin switches and copyable details such as subject and fingerprint                               |
| Custom           | Upload PEM/DER, import known paths, delete certificates, and view details                                    |
| Hot mount        | Temporarily mount/unmount user-store or shared-storage CAs when the component is installed and `hot_allow=1` |

Permanent changes normally require a **reboot**. Hot mounts take effect immediately and disappear after reboot.

## Logs

Inspect `data/install.log` and runtime logs, filter by severity, or search for tags such as `inject:`, `generation:`, and `hide:`. When injection fails, Home and Logs show a readable cause and suggested action.

## Hide

This page appears only when a related component is installed. It contains:

- Live mount/hide status and instructions specific to the current root solution
- `hide_allow`, `zn_hide_allow`, whitelist editing, and immediate re-registration
- A dismissible capture checklist
- **Advanced experiments:** `force_bind_capture`, `late_inject`, `boot_bind_zygote`, `boot_multi_apex`, and `service_probe`

Advanced settings are off by default to minimize traces. Enable them only when certificate injection needs extra compatibility. See [Mount hiding](./hide) and [Configuration](./config).

## More

| Section         | Contents                                                 |
| --------------- | -------------------------------------------------------- |
| Mount mode      | `compatible` / `magic`; reboot after changing            |
| Temporary layer | `tmpfs_style`                                            |
| Appearance      | Light/dark mode and accent color                         |
| Updates         | Stable/CI channel and update check                       |
| About           | Version, installed-component profile, and donation entry |

## Hot-update path

Cross-installer hot updates may briefly use:

```text
/data/adb/certbridge/
```

You can normally ignore this directory; temporary update files are cleaned when the update completes.
