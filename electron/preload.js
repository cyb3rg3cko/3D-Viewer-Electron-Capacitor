const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('viewerAPI', {
  /** Tell main the UI is ready; resolves with any files queued during startup. */
  ready: () => ipcRenderer.invoke('renderer-ready'),
  /** Called with a file path whenever the OS asks the running app to open a file. */
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file', (_event, filePath) => callback(filePath));
  },
  /** Returns { name, data: Uint8Array } for a path main has delivered. */
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
});
