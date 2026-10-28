const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const SUPPORTED_EXTS = new Set(['.glb', '.gltf', '.fbx', '.vrm', '.stl']);

let mainWindow = null;
let rendererReady = false;
const pendingPaths = [];       // files requested before the renderer was ready
const allowedPaths = new Set(); // only files the OS handed us may be read by the renderer

/* Pull a model path out of a command line (Windows/Linux double-click, "Open with", CLI). */
function findModelPath(argv, cwd = process.cwd()) {
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue;
    const p = path.resolve(cwd, arg);
    if (SUPPORTED_EXTS.has(path.extname(p).toLowerCase()) && fs.existsSync(p)) return p;
  }
  return null;
}

function openPath(filePath) {
  if (!filePath) return;
  allowedPaths.add(filePath);
  if (mainWindow && rendererReady) {
    mainWindow.webContents.send('open-file', filePath);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingPaths.push(filePath);
  }
}

/* Only one instance: a second double-click forwards its file to the running window. */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv, workingDirectory) => {
    const p = findModelPath(argv, workingDirectory);
    if (p) openPath(p);
    else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  /* macOS delivers files through this event, possibly before 'ready'. */
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    openPath(filePath);
  });

  const initial = findModelPath(process.argv);
  if (initial) openPath(initial);

  app.whenReady().then(() => {
    ipcMain.handle('renderer-ready', () => {
      rendererReady = true;
      return pendingPaths.splice(0);
    });

    ipcMain.handle('read-file', async (_event, filePath) => {
      if (!allowedPaths.has(filePath)) throw new Error('File was not opened by the user');
      const data = await fs.promises.readFile(filePath);
      return { name: path.basename(filePath), data };
    });

    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

function createWindow() {
  rendererReady = false;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 360,
    title: '3D Viewer',
    backgroundColor: '#1a1a1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; rendererReady = false; });

  // Dropping a file outside the drop handler must never navigate away from the viewer.
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
}
