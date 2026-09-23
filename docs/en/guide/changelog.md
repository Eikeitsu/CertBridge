# Changelog

## v4.3.1

- **WebUI 性能**: first screen `status --quick`; certificate switch no longer fully refreshes and introduces background writing; cut language with startTransition
- **多语言**: home trust state/pipeline/environment card/log empty state and other hard-coded Chinese access i18n

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
