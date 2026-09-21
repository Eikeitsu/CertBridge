# ci-dist

CertBridge **CI channel**: update manifest and module zips on the **same** branch tip.

| Path | Contents |
|------|----------|
| `update.json` | Magisk-compatible update check（默认 arm64 完整版） |
| `CertBridge_arm64.zip` | Full module arm64（latest CI；updateJson 默认） |
| `CertBridge_arm.zip` | Full module arm |
| `CertBridge_x86.zip` | Full module x86 |
| `CertBridge_x64.zip` | Full module x64 |
| `CertBridge_lite.zip` | Lite module (when built) |
| `changelog.md` | Short CI notes |

Stable / release channel remains GitHub Pages (`update.json` + `releases/`).

Last: 4.2.0.ci.197 @ c7665410ca0ff2ea74061508aea26a4d8a1366b5
