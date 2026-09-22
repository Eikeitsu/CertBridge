# CertBridge

System **CA inject** for Magisk / KernelSU / APatch: merge Reqable / ProxyPin / custom certs into the Android trust store, with optional hide assist, Zygisk filter, and WebUI.

- **ID**: `CertBridge`
- **Repo**: [Eikeitsu/CertBridge](https://github.com/Eikeitsu/CertBridge)
- **Docs**: [中文](https://eikeitsu.github.io/CertBridge/) · [English](https://eikeitsu.github.io/CertBridge/en/)
- **Releases**: [Download](https://github.com/Eikeitsu/CertBridge/releases)
- **中文说明**: [README.zh-CN.md](./README.zh-CN.md)

## Quick start

1. Download `*_arm64.zip` (or arm32 / x86 / x64 / lite) from Releases
2. Flash → **Vol+** default / **Vol-** custom → reboot
3. Open WebUI or run `cb status --live`

Language follows the system (`zh*` → Chinese, else English). Change in WebUI → Mount → Language.

## Layout

```text
module/      Magisk module
webui/       React WebUI
docs/        VitePress (zh root + /en)
locales/     Shared i18n JSON
scripts/     Build / release / i18n gen
tools/       cbx509 and helpers
docs-dev/    Maintainer build notes
changelog/   zh-CN.md + en.md
legacy/      Archived WebUI sources
```

Build: see [docs-dev/BUILD.md](./docs-dev/BUILD.md).
