import type { VaultItem, AppSettings } from '@shared/types'

export interface API {
  readFile: (path: string) => Promise<VaultItem | null>
  writeFile: (path: string, data: VaultItem) => Promise<void>
  createFile: (type: string, folder: string, title: string) => Promise<VaultItem>
  deleteFile: (path: string) => Promise<void>
  deleteDirectory: (path: string) => Promise<void>
  moveFile: (from: string, to: string) => Promise<void>
  selectVaultFolder: () => Promise<string | null>
  initializeVault: (path: string) => Promise<VaultItem[]>
  loadVault: (path: string) => Promise<VaultItem[]>
  completeTask: (path: string) => Promise<VaultItem | null>
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: AppSettings) => Promise<AppSettings>
  onFileChanged: (callback: (data: VaultItem) => void) => () => void
  onFileAdded: (callback: (data: VaultItem) => void) => () => void
  onFileDeleted: (callback: (path: string) => void) => () => void
}

declare global {
  interface Window {
    api: API
  }
}
