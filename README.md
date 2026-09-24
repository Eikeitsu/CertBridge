# CertBridge

System **CA inject** for Magisk / KernelSU / APatch: merge Reqable / ProxyPin / custom certs into the Android trust store. Optional WebUI, hot mount, hide assist, and Zygisk mount filter.

- **Display name / ID**: CertBridge · `CertBridge`
- **Repo**: [Eikeitsu/CertBridge](https://github.com/Eikeitsu/CertBridge)
- **Docs**: [中文](https://eikeitsu.github.io/CertBridge/) · [English](https://eikeitsu.github.io/CertBridge/en/)
- **Releases**: [Download](https://github.com/Eikeitsu/CertBridge/releases)
- **中文说明**: [README.zh-CN.md](./README.zh-CN.md)

## What it does

On each boot the module:

1. Reads the live system / Conscrypt APEX trust store (without saving a baseline)
2. Merges enabled addons (Reqable from app, ProxyPin, custom PEMs, …)
3. Bind-mounts the full set onto the trust-store paths (compatible mode)

It does **not** rewrite system partition files. If copy/validation fails, injection is skipped and the stock store stays intact.

| Piece                    | Role                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| Magisk module            | `post-fs-data` / `service` inject + optional late inject         |
| WebUI (optional)         | Home / certs / logs / hide / more                                |
| Hot mount (optional)     | Temporary user/SD certs until reboot                             |
| Hide assist (optional)   | SuSFS / `ksud` / NoHello try_umount (installed by default, off)  |
| Zygisk filter (optional) | Filter this module’s mounts in target processes (off by default) |
| CLI                      | `cb` → status / set / cert helpers                               |

UI language follows the system (`zh*` → Chinese, otherwise English). Change under WebUI → Mount → Language.

## Quick start

1. From [Releases](https://github.com/Eikeitsu/CertBridge/releases) download `CertBridge_v*_arm64.zip` (most phones). Use `arm32` / `x86` / `x64` for other ABIs, or `*_lite.zip` for a tiny package without OpenSSL.
2. Flash in your manager → within ~20s: **Vol+** default (recommended) / **Vol-** custom → **reboot**.
3. Open WebUI, or run `cb status --live`.

Online update (`updateJson`) tracks the **arm64 full** zip. Docs: [Install](https://eikeitsu.github.io/CertBridge/en/guide/install) · [Features](https://eikeitsu.github.io/CertBridge/en/guide/features) · [FAQ](https://eikeitsu.github.io/CertBridge/en/guide/faq).

## Mount modes (short)

| Mode                     | Notes                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Compatible** (default) | Full merge + bind; no Magic Mount meta-module required                               |
| **Magic**                | Overlay addons under `system/`; Magisk usually OK, KernelSU may need a correct stack |

Android 14+: prefer binding the main APEX and skip system when `experimental_14_system=skip` (default). Details in the [config guide](https://eikeitsu.github.io/CertBridge/en/guide/config).

## Layout

```text
module/      Magisk module
webui/       React WebUI
docs/        VitePress (zh root + /en)
locales/     Shared i18n JSON
scripts/     Build / release / i18n gen
tools/       cbx509 and helpers
docs-dev/    Maintainer notes (BUILD / RELEASE)
changelog.md Handwritten changelog (Chinese only; release auto-translates EN)
legacy/      Archived WebUI sources
```

Build & release: [docs-dev/BUILD.md](./docs-dev/BUILD.md) · [docs-dev/RELEASE.md](./docs-dev/RELEASE.md).
