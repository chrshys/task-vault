"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/preload/index.ts
var preload_exports = {};
__export(preload_exports, {
  api: () => api
});
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  readFile: (path) => import_electron.ipcRenderer.invoke("file:read", path),
  writeFile: (path, data) => import_electron.ipcRenderer.invoke("file:write", { path, data }),
  createFile: (type, folder, title) => import_electron.ipcRenderer.invoke("file:create", { type, folder, title }),
  deleteFile: (path) => import_electron.ipcRenderer.invoke("file:delete", path),
  deleteDirectory: (path) => import_electron.ipcRenderer.invoke("directory:delete", path),
  moveFile: (from, to) => import_electron.ipcRenderer.invoke("file:move", { from, to }),
  selectVaultFolder: () => import_electron.ipcRenderer.invoke("vault:select"),
  initializeVault: (path) => import_electron.ipcRenderer.invoke("vault:init", path),
  loadVault: (path) => import_electron.ipcRenderer.invoke("vault:load", path),
  completeTask: (path) => import_electron.ipcRenderer.invoke("task:complete", path),
  getSettings: () => import_electron.ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => import_electron.ipcRenderer.invoke("settings:set", settings),
  onFileChanged: (callback) => {
    const listener = (_event, data) => callback(data);
    import_electron.ipcRenderer.on("file:changed", listener);
    return () => import_electron.ipcRenderer.removeListener("file:changed", listener);
  },
  onFileAdded: (callback) => {
    const listener = (_event, data) => callback(data);
    import_electron.ipcRenderer.on("file:added", listener);
    return () => import_electron.ipcRenderer.removeListener("file:added", listener);
  },
  onFileDeleted: (callback) => {
    const listener = (_event, path) => callback(path);
    import_electron.ipcRenderer.on("file:deleted", listener);
    return () => import_electron.ipcRenderer.removeListener("file:deleted", listener);
  }
};
import_electron.contextBridge.exposeInMainWorld("api", api);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  api
});
