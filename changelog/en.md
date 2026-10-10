# Changelog

## Unreleased

## v5.1.0

- **Document**: Added [LSPosed module](docs/guide/lsposed.md) page to collect some ssl certificate related XP modules and vpn proxy related modules in the community
- **Install volume key**: `install/tools/volkey` (`EVIOCGRAB`) Install only the anti-volume system volume bar; clear with `install/`/`META-INF`/`customize.sh` after installation, do not enter the runtime module directory; default fallback `getevent`
- **Repair Zygisk Filter Error Normal App**: Anonymous executable pages are no longer removed from maps/smaps by default (which has caused flashback/network loss); only the path traces of this module are filtered. Optional `zn_hide_anon_exec=1`; tighten mount table path matching
- **Zygisk black and white list**: `zn_filter_mode=blacklist` (default, only blacklist filtering, empty = no filtering)\ | `whitelist` (in-list exemption, empty ≈ full machine); `zn_blacklist.txt`/`zn_whitelist.txt`; permanent exemption from capture
- **complementary reading meter leakage network path**: relative to `maps` + `/proc` dirfd, `fopen`, `__open_2`; host single test `npm run test:zygisk-filter`
- **hidden page**: explicitly "filter ≠ uninstall module"; grab packet check prompt umount will be invalidated; do not plug normal apps into the "do not filter list" when repairing
- **Track B (ZN Module)**: Packed only when `zn_modules.txt` has active rows and so is built; list of prohibited shell brushes
- **path fingerprint**: orphan staging after injection; alarm (Magic Mount) when mountinfo still contains `modules/CertBridge`, it is recommended that `compatible` + `tmpfs_style=dev`

## v5.0.3

- **dual log**: split `install.log` (new installation only) and `runtime.log` (each post-fs emptying); WebUI merge display, empty button only clear runtime
- **Hidden registration**: After the same path is no longer bind, log in once with after_inject; ksud/SuSFS failure Note stderr; "already exists" is considered successful
- **uninstallation path registration**: BakaSU synchronously writes to `ksud umount-config` (bootable and reloadable, persistent manager mark); no longer creates `susfs4ksu` configuration directory, if the module is not installed, clean up the left `/data/adb/susfs4ksu`; the registered path changes to the ksud list (does not rely on the mistakenly built susfs4ksu directory)
- **uninstall cleanup**: `uninstall.sh` cleanup ksud umount/umount-config, SuSFS try_umount.txt, NoHello managed blocks; still need reboot to remove cacerts script bind/Magic Mount
- **Hidden page switch Tab**: Full status Change the background tray polling, leave the hidden page to abort, avoid blocking the WebUI bridge
- **Hidden page probe experience**: probe shows "probe in progress..." instead of "no assistant"; this boot caches hide status; registers path to write module status and displays
- **SuSFS try_umount CLI**: Upstream v2 deprecated `add_try_umount`, changed to official `ksud kernel umount`; skipped and only played debug when no such subcommand was detected (non-registration failed)

## v5.0.2

- **switch Tab**: remove the entire table preheating (blocked the main thread); change the page one point + main cover Loading; mount the current page only as needed; change the full status to hide the page and pull
- **kernel_umount probe**: hot path removes slow `feature list`; `na` does not cache (refreshable); `--live` clears feat cache; compatible with `kernel_umount`/`KernelUmount`/id = 1
- **SuSFS detection**: remove `ksud` to help false positives; read config.gz with `gzip`/`toybox`; recognize `CONFIG_KSU_SUSFS`, `ksu_susfs` communication, legal version file; do not cache negative to avoid missing detection
- **ksud umount probe tightens**: removes the matching of help words such as `usage` and changes to subcommand/feature semantic features
- **Hidden Assistant Probe Reduction**: status Each valuable probe only runs once and is cached by boot; SuSFS cheap path is preferred; copywriting changed from "Detected" to "Available/Installed/Root included", etc.
- **Home Faster interactive**: the first screen only uses `status --quick`; full status/log delay; optimistic display of applied certificates when there is no runtime cache; stable state `--live` no longer enters the page
- **kernel_umount**: corresponding manager "Kernel level uninstall/Kernel umount" (SukiSU/ReSukiSU/KSU-Next etc. feature id = 1); probe and confirm feature get; page changes to display "Kernel level uninstall"
- **hot update clean probe cache**: Avoid displaying "kernel level uninstallation not detected" before hot update in the same boot

## v5.0.1

- **upgrade reserved configuration**: snapshot external `user.conf`/old module conf as soon as installation starts; default installation upgrade backfill `mount_mode`, switch and behavior direction keys; reserved `CERTBRIDGE_CONF_RESET_BELOW` (default 0, not triggered yet)
- Hidden Assistant Detection and Hidden Mount Assist Switch Decoupling

## v5.0.0

- **Zygisk mount filter**: filter mountinfo/mounts, maps/smaps; weaken map_files readlink, not required by default, install on demand
- **Zygisk smaps filtering repair**: discard by VMA whole paragraph (first line + Size/Rss field), avoid detecting App parsing missing smaps flashback; swallow C + + exceptions in hooks
- **Zygisk anonymous executable mapping**: maps/smaps hide `[anonymous]`/unnamed executable page (PLT springboard trace), keep art tags such as `[anon:…]`
- **SuSFS detection**: subject to the kernel (`/proc/config.gz`/`ksu_susfs show version`), independent of the manager module; hidden assistance is registered directly by this module `ksud`/`ksu_susfs`

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
