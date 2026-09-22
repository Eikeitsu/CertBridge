# Frequently asked questions

Browse by scenario. Use WebUI or the [CLI](./cli) to change settings; see [Configuration](./config) for key definitions.

## Installation and updates

### Where can I download the module?

Only from [GitHub Releases](https://github.com/Eikeitsu/CertBridge/releases). Choose `*_arm64.zip` for most devices, or the matching arm32/x86/x64 package. The Lite package omits OpenSSL. The documentation site does not host installation zips.

### I flashed the module, but nothing changed or the certificate is still wrong

1. **Reboot** once.
2. On WebUI Home, confirm that the main status says the module is healthy rather than failed or still detecting.
3. Force-stop and reopen both the target app and Reqable/ProxyPin.
4. Select **Refresh and verify**, or run:

   ```bash
   /data/adb/modules/CertBridge/bin/cb status --live
   ```

5. If it still fails, inspect `inject:` and `generation:` messages in Logs and follow the diagnostics shown on Home or by the Action command.

### WebUI does not open

WebUI must be selected during installation (the default profile includes it), and your manager must support module web pages. It cannot run in an ordinary browser. Reflash the same version and select WebUI if necessary.

### Why is there no Hide page?

Neither mount-hide assistance nor the Zygisk filter is installed. Default installation includes hide assistance, but custom installation can skip both. Reflash and select at least one component.

### Why is the Zygisk filter unavailable, or why does installation report a missing `.so`?

Default installation does not install this component; custom installation offers it. If the package has no `zygisk/*.so`, the selection reports that the binary is missing. Use an official package that contains the binary or build it yourself.

### Did an update reset my settings?

An in-place upgrade attempts to preserve `certs.conf` and custom certificates, but volume-key component choices are asked again during installation. WebUI **More** can switch between stable and CI update channels.

## Capture and certificates

### Reqable says “root certificate not installed,” or capture breaks networking {#root-cert-missing}

First check whether root hiding removed the certificate mount:

| Symptom                                                   | Common cause                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Capture tool says its root is not installed               | Module unmount, DenyList unmount, or “exclude modifications” is enabled for that tool |
| Target app loses networking or reports certificate errors | Unmount is enabled for the **target app**                                             |

Disable module unmounting for Reqable/ProxyPin **and every target being captured**. Enable it only for apps outside the capture path. See [Mount hiding](./hide).

### Status is healthy, but capture still breaks networking

A very common cause is that the capture app's current root CA is not the certificate enabled in CertBridge.

1. When Reqable generates a new CA, synchronize it again; CertBridge does not bundle a sample Reqable CA.
2. ProxyPin uses the app's current certificate. A fingerprint mismatch means it is not the same CA.
3. A user certificate is not equivalent to a system certificate; CertBridge injects into system/Conscrypt APEX trust stores.
4. Compare the WebUI certificate-detail fingerprint with the one displayed by the capture app.

Use refresh/verify or `cb sync_apps`, or import the CA as a custom certificate and **reboot**. Hot mount can be used for a temporary test.

### The system CA works, but an individual app still loses networking {#cert-pinning}

CertBridge only places the capture CA in Android's system trust store. Some apps do not rely entirely on those trust anchors:

- **Certificate pinning:** accepts only embedded public keys or fingerprints and rejects a system-trusted interception certificate.
- **Private trust store or custom TLS stack:** embeds its own CA list or bypasses the system `TrustManager`.
- Other hardening and Network Security Config policies may also change which anchors are accepted.

If the capture tool's certificate manager shows its root as installed, CertBridge reports a healthy live status, and fingerprints match, system injection is working. Investigate the app's pinning or private trust policy instead of repeatedly reinstalling CertBridge.

Solutions for bypassing app-level TLS checks, such as an Xposed/LSPosed module or a capture tool's own facility, are outside CertBridge. Compatibility, security, and legal implications depend on the app and version.

### Capturing all apps works, but selecting one app disconnects it {#whitelist-disconnect}

This is usually a capture-tool interception-scope, per-app VPN, or DNS issue rather than CertBridge. Test capture for all apps first; if it still fails, check CA fingerprints and unmount settings.

### Why is status abnormal immediately after reboot, then healthy later?

Some namespaces are not ready at the first boot check. Recent versions retry with backoff and can heal later; selecting **Refresh and verify** is also sufficient. The advanced `late_inject` and `service_probe` options are off by default to reduce traces—enable them only if the device needs additional compatibility.

## Mounts and devices

### Widespread HTTPS failures, with only a few system CAs remaining

In Lite Magic mode, some KernelSU configurations replace the complete `system/` directory and hide the original CAs. Switch back to **compatible** mode immediately and reboot. See [Mount modes](./config#mount-modes).

### Some apps still do not trust the CA on Android 14+

The default binds only the primary APEX and skips system to minimize traces. Try these in order, rebooting after each change:

1. `experimental_14_system=auto`
2. `boot_multi_apex=1`
3. `boot_bind_zygote=1` and/or `late_inject=1`

Use WebUI **Hide → Advanced experiments** or `cb set`.

### Can I use CertBridge with another certificate or mount module?

Avoid multiple modules changing the same cacerts store. Remove other certificate modules, reboot, and test again. Hot mount refuses to forcibly remove an unknown upper overlay and asks you to reboot instead.

## Interface and configuration

### How do I use the command line?

```bash
/data/adb/modules/CertBridge/bin/cb help
```

Common commands include `status --live`, `set`, `sync_apps`, and `hot_mount`. See the complete [CLI reference](./cli).

### Why did a hot-mounted CA disappear after reboot?

This is expected: hot-mount sessions are temporary. For persistence, import a custom certificate or keep the Reqable/ProxyPin source enabled and reboot.

### Which capture tools are supported?

See [Related software](./related) for Reqable, ProxyPin, HttpCanary, ADGuard, and manual-import guidance.
