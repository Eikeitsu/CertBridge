# ci-dist

CertBridge **CI channel**: update manifest and module zips on the **same** branch tip.

| Path | Contents |
|------|----------|
| `update.json` | Magisk-compatible update check（默认 arm64 完整版） |
| `CertBridge_arm64.zip` | Full module arm64（latest CI；updateJson 默认） |
| `CertBridge_arm32.zip` | Full module arm32（armeabi-v7a） |
| `CertBridge_x86.zip` | Full module x86 |
| `CertBridge_x64.zip` | Full module x64 |
| `CertBridge_lite.zip` | Lite module (when built) |
| `changelog.md` | Short CI notes |

Stable / release channel remains GitHub Pages (`update.json` + `releases/`).

Last: 4.3.0.ci.238 @ 28f5a18f552ce616c188551c0e4f2439f9e1fbbb
