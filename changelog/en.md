# Changelog

## Unreleased

- **Zygisk mount filter**: `native/zygisk_hide`, build script, default `zn_whitelist.txt`; `build:module` builds the `.so`; CI installs NDK with `REQUIRE_ZYGISK_HIDE=1`; `zn_hide_allow` follows shell `read_conf` and prefers external `user.conf`

## v4.3.1

- **WebUI performance**: First screen uses `status --quick`; cert toggles no longer full-refresh and write the prop in the background; language switch uses startTransition
- **Multi-language**: Hard-coded Chinese on home trust state / pipeline / env card / empty log state wired into i18n

## v4.3.0

- **Internationalization**: Shared `locales/` copy; WebUI i18next; install/prop follow system language (non-zh/en fall back to English)
- **Splash screen**: Brand wordmark + thin progress bar only; remove "Loading" copy and large spinner
- **Install prompts**: Volume-key tips shortened to brief lines
- **Repo layout**: `scripts/` / `tools/` / `docs-dev/` / `legacy/`; dual Chinese/English changelog files

## v4.2.2

- **Artifact suffix**: 32-bit ARM zips renamed from `*_arm.zip` / `CertBridge_arm.zip` to `*_arm32.zip` / `CertBridge_arm32.zip` (armeabi-v7a); `OPENSSL_ABIS=arm` still supported
- **Pending-reboot banner**: Clear pending-reboot state and home tip when cert toggles / mount mode / skip-system / path style again match the boot-applied snapshot
- **CI**: Release versionCode must be above the latest CI versionCode at publish time

## Earlier

English entries above cover recent releases. Full older history remains in the Chinese changelog (`changelog.md` / docs site).
