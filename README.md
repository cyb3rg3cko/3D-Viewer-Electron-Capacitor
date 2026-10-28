# 3D Viewer

Viewer for GLB, glTF, FBX, VRM, STL and OBJ models.

- **Desktop** (Windows, macOS, Linux): Electron, in `electron/`
- **Android**: Capacitor, which wraps the same web app in `www/`

## Run locally

```bash
npm install
npm start                      # desktop app
npm start -- path/to/model.glb # open a model directly
```

## Releases

Push a tag and GitHub Actions builds and publishes a release:

```bash
git tag Desktop_v1.0.0 && git push origin Desktop_v1.0.0   # .exe, .dmg, .AppImage, .deb
git tag Android_v1.0.0 && git push origin Android_v1.0.0   # .apk
```

The version number comes from the tag. Both workflows can also be run by hand
from the Actions tab (artifacts only, no release).

## App icon

Put `icon.png` and/or `icon.ico` in the repo root; both builds pick them up.

- **`icon.png`** (1024x1024 recommended) is used everywhere: macOS, Linux, Android,
  and Windows too when there's no `.ico`.
- **`icon.ico`** is used as-is for Windows. If there's no `icon.png`, the largest
  image inside the `.ico` is used for the other platforms (usually 256px, so it's
  upscaled and looks soft; add an `icon.png` for a crisp result).

On Android the whole icon is scaled to fit inside the launcher's mask, on a navy
`#04163f` background (`ANDROID_BG` in `scripts/prepare-icons.mjs`). Without either file the
default Electron and Capacitor icons are used.

To preview locally: `node scripts/prepare-icons.mjs && npm start`.

## Opening files by double-click

**Desktop.** The installers register `.glb .gltf .fbx .vrm .stl .obj`. Use the Windows
installer (`.exe`) or the `.deb` on Linux; an AppImage does not register file
types unless integrated with a tool like AppImageLauncher. If the app is already
open, double-clicking another file opens it in the existing window.

**Linux** builds target Ubuntu 22.04 and newer (and other distros of similar age).
The `.deb` is the recommended install. The AppImage needs FUSE 2
(`sudo apt install libfuse2` on 22.04, `libfuse2t64` on 24.04+), and on 24.04+ you
may need to run it with `--no-sandbox` because of Ubuntu's AppArmor restrictions.

**Graphics on Linux.** Chromium disables WebGL2 on many Linux GPU drivers, which
would leave the viewer blank, so the app ignores that blocklist and falls back to
software rendering if the GPU still can't help. If a driver misbehaves anyway, start
it with `VIEWER3D_SOFTWARE_GL=1 viewer3d` (or `VIEWER3D_SOFTWARE_GL=1 ./3D-Viewer*.AppImage`).
`libva error` lines in the terminal are harmless (hardware video decoding, unused here).

**Android.** The app appears under "Open with" for model files. Many file managers
report these files as `application/octet-stream`, so the app also accepts that
type and detects the real format from the file contents.

## Signing (optional)

**Android.** Without secrets, CI builds a debug-signed APK, which installs fine
by sideloading. To sign a release build, add these repository secrets:

| Secret | Value |
| --- | --- |
| `ANDROID_KEY_BASE64` | `base64 -w0 release.keystore` |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | password (used for both the keystore and the key) |

Create a keystore with:
`keytool -genkey -v -keystore release.keystore -alias viewer3d -keyalg RSA -keysize 2048 -validity 10000`

Keep the same keystore for every release, or Android will refuse to update the app.

**macOS / Windows.** Builds are unsigned. On macOS, if Gatekeeper says the app is
damaged, run `xattr -cr "/Applications/3D Viewer.app"`. Windows SmartScreen will
show "More info → Run anyway".
