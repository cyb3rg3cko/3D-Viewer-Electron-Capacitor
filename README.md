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

## Open files by Double-Click, File Dropdown, or Drag-and-Drop

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

**Large models.** Textures are capped at 4096 px so oversized ones (e.g. 8K scans)
don't exhaust video memory. If the GPU still runs out, the viewer recovers with
2048 px, then 1024 px textures, and as a last resort unloads the model with a message
instead of freezing.

**Android.** The app appears under "Open with" for model files. Many file managers
report these files as `application/octet-stream`, so the app also accepts that
type and detects the real format from the file contents.

**macOS / Windows.** Builds are unsigned. On macOS, if Gatekeeper says the app is
damaged, run `xattr -cr "/Applications/3D Viewer.app"`. Windows SmartScreen will
show "More info → Run anyway".

**Uninstall on Linux with** sudo apt remove viewer3d
The name is reversed like that to satisfy wrappers that don't like number first names.
