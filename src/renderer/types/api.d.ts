import type { VaultItem, AppSettings, VaultConfig } from '@shared/types'

export type WriteResult = { success: true } | { success: false; conflict: true }

export interface API {
  readFile: (path: string) => Promise<VaultItem | null>
  writeFile: (path: string, data: VaultItem) => Promise<WriteResult>
  forceWriteFile: (path: string, data: VaultItem) => Promise<void>
  createFile: (type: string, folder: string, title: string) => Promise<VaultItem>
  deleteFile: (path: string) => Promise<void>
  deleteDirectory: (path: string) => Promise<void>
  renameDirectory: (oldPath: string, newName: string) => Promise<string>
  moveFile: (from: string, to: string) => Promise<void>
  selectVaultFolder: () => Promise<string | null>
  initializeVault: (path: string) => Promise<VaultItem[]>
  loadVault: (path: string) => Promise<VaultItem[]>
  getVaultConfig: (path: string) => Promise<VaultConfig>
  setVaultConfig: (path: string, config: VaultConfig) => Promise<VaultConfig>
  completeTask: (path: string) => Promise<{ item: VaultItem | null; conflict: boolean }>
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: AppSettings) => Promise<AppSettings>
  onFileChanged: (callback: (data: VaultItem) => void) => () => void
  onFileAdded: (callback: (data: VaultItem) => void) => () => void
  onFileDeleted: (callback: (path: string) => void) => () => void
  onReminderClicked: (callback: (data: { taskId: string }) => void) => () => void
}

declare global {
  interface Window {
    api: API
  }
}
