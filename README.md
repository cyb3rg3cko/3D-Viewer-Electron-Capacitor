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

## Opening files by double-click

**Desktop.** The installers register `.glb .gltf .fbx .vrm .stl .obj`. Use the Windows
installer (`.exe`) or the `.deb` on Linux; an AppImage does not register file
types unless integrated with a tool like AppImageLauncher. If the app is already
open, double-clicking another file opens it in the existing window.

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
