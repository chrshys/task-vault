import { contextBridge, ipcRenderer } from 'electron'

export type WriteResult = { success: true } | { success: false; conflict: true }

export const api = {
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, data: unknown): Promise<WriteResult> => ipcRenderer.invoke('file:write', { path, data }),
  forceWriteFile: (path: string, data: unknown) => ipcRenderer.invoke('file:forceWrite', { path, data }),
  createFile: (type: string, folder: string, title: string) =>
    ipcRenderer.invoke('file:create', { type, folder, title }),
  deleteFile: (path: string) => ipcRenderer.invoke('file:delete', path),
  deleteDirectory: (path: string) => ipcRenderer.invoke('directory:delete', path),
  renameDirectory: (oldPath: string, newName: string) =>
    ipcRenderer.invoke('directory:rename', { oldPath, newName }),
  moveFile: (from: string, to: string) => ipcRenderer.invoke('file:move', { from, to }),
  selectVaultFolder: () => ipcRenderer.invoke('vault:select'),
  initializeVault: (path: string) => ipcRenderer.invoke('vault:init', path),
  loadVault: (path: string) => ipcRenderer.invoke('vault:load', path),
  getVaultConfig: (path: string) => ipcRenderer.invoke('vault:config:get', path),
  setVaultConfig: (path: string, config: unknown) => ipcRenderer.invoke('vault:config:set', { folderPath: path, config }),
  completeTask: (path: string): Promise<{ item: unknown; conflict: boolean }> => ipcRenderer.invoke('task:complete', path),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('settings:set', settings),
  onFileChanged: (callback: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('file:changed', listener)
    return () => ipcRenderer.removeListener('file:changed', listener)
  },
  onFileAdded: (callback: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('file:added', listener)
    return () => ipcRenderer.removeListener('file:added', listener)
  },
  onFileDeleted: (callback: (path: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
    ipcRenderer.on('file:deleted', listener)
    return () => ipcRenderer.removeListener('file:deleted', listener)
  },
  onReminderClicked: (callback: (data: { taskId: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { taskId: string }) => callback(data)
    ipcRenderer.on('reminder:clicked', listener)
    return () => ipcRenderer.removeListener('reminder:clicked', listener)
  },
}

contextBridge.exposeInMainWorld('api', api)
