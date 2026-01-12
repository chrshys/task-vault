import { createRequire } from 'module';import { fileURLToPath } from 'url';import { dirname } from 'path';const require = createRequire(import.meta.url);const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);

// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";
var api = {
  readFile: (path) => ipcRenderer.invoke("file:read", path),
  writeFile: (path, data) => ipcRenderer.invoke("file:write", { path, data }),
  createFile: (type, folder, title) => ipcRenderer.invoke("file:create", { type, folder, title }),
  deleteFile: (path) => ipcRenderer.invoke("file:delete", path),
  moveFile: (from, to) => ipcRenderer.invoke("file:move", { from, to }),
  selectVaultFolder: () => ipcRenderer.invoke("vault:select"),
  initializeVault: (path) => ipcRenderer.invoke("vault:init", path),
  loadVault: (path) => ipcRenderer.invoke("vault:load", path),
  completeTask: (path) => ipcRenderer.invoke("task:complete", path),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
  onFileChanged: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("file:changed", listener);
    return () => ipcRenderer.removeListener("file:changed", listener);
  },
  onFileAdded: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("file:added", listener);
    return () => ipcRenderer.removeListener("file:added", listener);
  },
  onFileDeleted: (callback) => {
    const listener = (_event, path) => callback(path);
    ipcRenderer.on("file:deleted", listener);
    return () => ipcRenderer.removeListener("file:deleted", listener);
  }
};
contextBridge.exposeInMainWorld("api", api);
export {
  api
};
