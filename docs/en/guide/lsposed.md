# LSPosed modules

CertBridge only writes CAs into the **system trust store**. If the capture tool already shows the root as installed and CertBridge status is healthy, but **one app still loses networking**, that app likely uses **certificate pinning** or a private TLS stack. Those cases need an in-process hook.

The modules below are common community options—they are **not** CertBridge dependencies. Assess risk and legality yourself; scope only the apps you capture, then force-stop them after enabling the module. For capture apps themselves, see [Related software](./related).

## Framework

Install a framework first (pick one that matches your device and root stack):

| Framework                               | Notes                                                   | Repo / download                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LSPosed (official)**                  | Zygisk-based Xposed; still maintained                   | [lsposed.org](https://lsposed.org) · short URL for latest builds [lsposed.zip](https://lsposed.zip) · [GitHub Releases](https://github.com/LSPosed/LSPosed/releases) |
| **JingMatrix / Vector** (optional fork) | Community fork; sometimes ahead on new Android versions | [JingMatrix/LSPosed](https://github.com/JingMatrix/LSPosed) · [Releases](https://github.com/JingMatrix/LSPosed/releases)                                             |
| **Module repository**                   | Browse or install some modules in the manager           | [LSPosed modules](https://modules.lsposed.org/)                                                                                                                      |

Prefer official [Releases](https://github.com/LSPosed/LSPosed/releases) or **lsposed.zip** for stable builds; preview builds are on GitHub Actions. Enable **Zygisk** in Magisk or a compatible manager and flash `*-zygisk-*.zip`. **Riru**-based packages are obsolete—do not install `*-riru-*.zip` on new setups.

## SSL / certificate-pinning bypass

See [FAQ · system CA works but one app still fails](./faq#cert-pinning). Compatibility varies by app and hardening; try another module or a narrower scope if needed.

| Module                    | Role                                                                                                | Repo                                                                                                         | Download                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **JustTrustMe**           | Classic Xposed SSL / pinning bypass (older; may fail on newer apps)                                 | [Fuzion24/JustTrustMe](https://github.com/Fuzion24/JustTrustMe)                                              | [Releases](https://github.com/Fuzion24/JustTrustMe/releases)                     |
| **TrustMeAlready**        | Broad SSL verification relax; upstream archived                                                     | [ViRb3/TrustMeAlready](https://github.com/ViRb3/TrustMeAlready) (archived)                                   | [Releases v1.11](https://github.com/ViRb3/TrustMeAlready/releases)               |
| **TrustMeAlready (fork)** | 2024 community fork                                                                                 | [mobile46/TrustMeAlready](https://github.com/mobile46/TrustMeAlready)                                        | [Releases v1.0](https://github.com/mobile46/TrustMeAlready/releases)             |
| **TrustMe**               | Newer unified unpin with Compose settings and per-hook toggles                                      | [kirklin/TrustMe](https://github.com/kirklin/TrustMe)                                                        | See repo Releases / build locally                                                |
| **SSLBypass**             | LSPosed module for multiple SSL check / pinning bypass paths (listed on the module repo since 2025) | [errorman-awful/SSLBypass](https://github.com/errorman-awful/SSLBypass) · package `com.winnersonx.sslbypass` | [Module repo page](https://modules.lsposed.org/module/com.winnersonx.sslbypass/) |
| **SSL Kill Switch (LSP)** | Java-layer bypass plus some Flutter / native paths                                                  | [0xdad0/ssl-kill-switch-lsposed](https://github.com/0xdad0/ssl-kill-switch-lsposed)                          | See repo Releases / README                                                       |
| **SSLUnpinner**           | Standard Android SSL APIs plus Flutter `libflutter` runtime patch                                   | [AhmedZero/SSLUnpinner](https://github.com/AhmedZero/SSLUnpinner)                                            | See repo Releases / README                                                       |

### Tips

1. Enable the module in LSPosed and scope the **target capture apps** (usually not the system framework unless the module docs require it).
2. Force-stop the target app, then capture again; try another module above, or the capture tool's own SSL / pinning bypass if present.
3. With CertBridge: confirm system CA and fingerprints first, then enable unpinning. Unpin modules do not replace system-trust injection.

## Clones, dual apps, and VPN capture {#clone-vpn}

**CertBridge does not manage VPN or proxy routing**—it only installs system CAs. It will not extend a capture app's `VpnService` / TUN to every user profile or clone instance.

Typical cases (especially **ColorOS / OPPO app clone** and some **system dual-space** setups):

- Traffic from the main copy goes through the capture VPN, but the **clone copy never enters the tunnel**;
- Per-app VPN / whitelist mode works for one instance but fails when only the clone is selected.

Try these first (outside CertBridge):

1. Capture **all apps**, or use **Wi‑Fi proxy + system CA** instead of per-app VPN;
2. Install the **capture app inside the clone space** and grant VPN there; avoid running two VPN clients (main + clone);
3. Do not enable **app clone** on the VPN / capture client itself.

For ColorOS clone + VPN capture, community **LSPosed patches** exist (system-side hooks so VPN can take over clone traffic), for example:

| Module              | Role                                             | Repo                                                                      |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| **Coloros VPN fix** | Fix VPN not controlling **app clone** on ColorOS | [fengxi555/Coloros-VPN-fix](https://github.com/fengxi555/Coloros-VPN-fix) |

Follow that module's README for scope and reboot; firmware varies and success is not guaranteed.

If the issue is the app **refusing to run while VPN is detected** (not missing tunnel traffic), see the next section—the fixes differ.

### Apps that detect an active VPN

| Module                     | Notes                                                                                                 | Repo / download                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **NoVPNDetect**            | Classic in-process VPN hiding for scoped apps                                                         | [Module repo](https://modules.lsposed.org/module/me.hoshino.novpndetect/) · [Bitbucket](https://bitbucket.org/yuri-project/novpndetect) |
| **NoVPNDetect Enhanced**   | More Java / some native APIs; debug logging                                                           | [BlueCat300/NoVPNDetectEnhanced](https://github.com/BlueCat300/NoVPNDetectEnhanced)                                                     |
| **VPN Hide**               | Hooks `system_server`; optional kernel backend to hide `tun`; less in-target footprint                | [okhsunrog/vpnhide](https://github.com/okhsunrog/vpnhide)                                                                               |
| **HandsOffMyVPN**          | In-target hooks for common VPN detection APIs                                                         | [thelok1s/hands-off-my-vpn](https://github.com/thelok1s/hands-off-my-vpn)                                                               |
| **OplusNoVpnNotification** | Removes ColorOS / OxygenOS “VPN activated” notification only (**not** clone routing or app detection) | [libxzr/OplusNoVpnNotification](https://github.com/libxzr/OplusNoVpnNotification)                                                       |

Apps with anti–LSPosed checks may break in-process modules; **VPN Hide** (system framework scope + in-app target list) is often tried first.

## Do not confuse with SSL bypass

| Module           | Actual purpose                                                                                                 | Repo                                                          | Download                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| **Tricky Store** | Rewrites Keystore / attestation chains (Play Integrity, device attestation). **Not** an HTTP(S) pinning bypass | [5ec1cff/TrickyStore](https://github.com/5ec1cff/TrickyStore) | [Releases](https://github.com/5ec1cff/TrickyStore/releases) |

Use Tricky Store for key / integrity attestation issues. For capture failures from a missing system CA or app pinning, prefer CertBridge plus an SSL module above—not Tricky Store.
