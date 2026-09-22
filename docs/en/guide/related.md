# Related software

CertBridge only writes CAs into the **system trust store**; it does not provide a traffic-capture proxy. The following tools are detected for automatic or prompted import, or are commonly imported manually.

## Automatic or installation-time import

| Software       | Link                                                 | CertBridge integration                                                                                                                      |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reqable**    | [reqable.com](https://reqable.com)                   | Reads the root CA from the installed app; no sample is bundled. Can be toggled and resynchronized at boot or refresh                        |
| **ProxyPin**   | [GitHub](https://github.com/wanghongenpin/proxypin)  | Prefers the installed app's CA. If none is detected and ProxyPin was enabled during installation, uses the bundled fallback. Can be toggled |
| **HttpCanary** | [GitHub](https://github.com/MegatronKing/HttpCanary) | May be offered for import as a **custom** certificate during installation only                                                              |
| **ADGuard**    | [adguard.com](https://adguard.com)                   | May be offered for import as a **custom** certificate during installation only                                                              |

When WebUI refreshes, it may also detect a current HttpCanary or ADGuard CA whose fingerprint has not been seen and offer to import it as a custom certificate.

## Manual import

For Charles, mitmproxy, PCAPdroid, HttpCanary when not imported at installation, and similar tools:

- Upload a PEM or DER file on WebUI's **Certificates** page.
- Or place it under the module's `certs/custom/`; it will be merged at the next boot.
- Several common app paths are available as one-click import presets; check the hints on the Certificates page.

To test a CA from Android's user-credential store or shared storage temporarily, use optional [hot mounting](./config#hot-mount). The session disappears after reboot. Use custom import for a permanent CA.

## Capture cautions

- A **user certificate** in credentials or `cacerts-added` is not the same as a **system certificate**. Many apps do not trust user CAs as system CAs; CertBridge targets the system and Conscrypt APEX trust stores.
- Enabling “unmount modules” for Reqable, ProxyPin, or a target app removes the CA mount and can cause “root certificate not installed” or networking failures. See [Mount hiding](./hide) and [FAQ](./faq#root-cert-missing).
- If capturing all apps works but selecting a single app disconnects it, the likely cause is the capture tool's per-app VPN or DNS behavior. See the [FAQ](./faq#whitelist-disconnect).

Before capture, confirm that the fingerprint shown by the app matches the certificate enabled in CertBridge.
