<div align="center">

# CertBridge

**System CA injection** for Magisk / KernelSU / APatch

Merge Reqable, ProxyPin, and custom PEMs into the Android trust store — without rewriting the system partition.

[简体中文](./README.zh-CN.md) · [Docs](https://eikeitsu.github.io/CertBridge/en/) · [Releases](https://github.com/Eikeitsu/CertBridge/releases)

<br />

[![Release](https://img.shields.io/github/v/release/Eikeitsu/CertBridge?style=for-the-badge&label=Release)](https://github.com/Eikeitsu/CertBridge/releases)
[![Android](https://img.shields.io/badge/Android-7%E2%80%9316-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://eikeitsu.github.io/CertBridge/en/guide/install)
[![Root](https://img.shields.io/badge/Root-Magisk%20%7C%20KSU%20%7C%20APatch-orange?style=for-the-badge)](https://eikeitsu.github.io/CertBridge/en/)
[![License](https://img.shields.io/github/license/Eikeitsu/CertBridge?style=for-the-badge)](./LICENSE)

<br />

<img src="https://skillicons.dev/icons?i=react,typescript,vite,redux,sass,androidstudio,cpp,java,bash,nodejs,githubactions" alt="Tech stack" />

</div>

## Features

| Component     | Role                                                              |
| ------------- | ----------------------------------------------------------------- |
| Magisk module | Boot inject via `post-fs-data` / `service` (optional late inject) |
| WebUI         | Home · certs · logs · hide · settings                             |
| Hot mount     | Temporary user / SD certs until reboot                            |
| Hide assist   | `ksud` kernel umount / SuSFS / NoHello (bundled, off by default)  |
| Zygisk filter | Hide this module’s mounts in target processes (opt-in)            |
| CLI           | `cb` — status / set / cert helpers                                |

UI language follows the system (`zh*` → Chinese, otherwise English). Change under **WebUI → Mount → Language**.

## How it works

On each boot the module:

1. Reads the live system / Conscrypt APEX trust store (no saved baseline)
2. Merges enabled addons (Reqable from app, ProxyPin, custom PEMs, …)
3. Bind-mounts the full set onto trust-store paths (compatible mode)

Copy or validation failure skips injection — the stock store stays intact.

## Quick start

1. Download `CertBridge_v*_arm64.zip` from [Releases](https://github.com/Eikeitsu/CertBridge/releases) (most phones). Use `arm32` / `x86` / `x64` for other ABIs, or `*_lite.zip` for a smaller package without OpenSSL.
2. Flash in your manager → within ~20s: **Vol+** default (recommended) / **Vol-** custom → **reboot**.
3. Open the WebUI, or run `cb status --live`.

Online update (`updateJson`) tracks the **arm64 full** zip.

📖 [Install](https://eikeitsu.github.io/CertBridge/en/guide/install) · [Features](https://eikeitsu.github.io/CertBridge/en/guide/features) · [FAQ](https://eikeitsu.github.io/CertBridge/en/guide/faq)

## Mount modes

| Mode                     | Notes                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Compatible** (default) | Full merge + bind; no Magic Mount meta-module required                               |
| **Magic**                | Overlay addons under `system/`; Magisk usually OK, KernelSU may need a correct stack |

Android 14+: prefer binding the main APEX and skip system when `experimental_14_system=skip` (default). See the [config guide](https://eikeitsu.github.io/CertBridge/en/guide/config).

## Tech stack

| Area    | Stack                                                         |
| ------- | ------------------------------------------------------------- |
| WebUI   | React 18 · TypeScript · Vite · Redux Toolkit · Sass · i18next |
| Module  | POSIX shell · Magisk module scripts                           |
| Native  | Zygisk C++ (NDK) · optional `cbx509` (Java → dex)             |
| Docs    | VitePress                                                     |
| Tooling | Node.js · ESLint · ShellCheck · Prettier · GitHub Actions     |

Icons above via [Skill Icons](https://skillicons.dev); badges via [Shields.io](https://shields.io).

## Repository layout

```text
module/       Magisk module
webui/        React WebUI
docs/         VitePress (zh root + /en)
locales/      Shared i18n JSON
scripts/      Build / release / i18n
tools/        cbx509 and helpers
docs-dev/     Maintainer notes (BUILD / RELEASE)
changelog.md  Handwritten changelog (zh; release auto-translates EN)
legacy/       Archived WebUI sources
```

Build & release: [docs-dev/BUILD.md](./docs-dev/BUILD.md) · [docs-dev/RELEASE.md](./docs-dev/RELEASE.md)

## Links

- **Repo**: [Eikeitsu/CertBridge](https://github.com/Eikeitsu/CertBridge)
- **Docs**: [中文](https://eikeitsu.github.io/CertBridge/) · [English](https://eikeitsu.github.io/CertBridge/en/)
- **ID**: `CertBridge`
