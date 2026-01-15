import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import type { AppSettings, VaultConfig, VaultItem, ItemType } from '../shared/types'
import * as fileService from './services/file-service'
import * as reminderService from './services/reminder-service'

let mainWindowRef: BrowserWindow | null = null

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')

const defaultSettings: AppSettings = {
  vaultPath: null,
  theme: 'system',
  showCompleted: true,
  defaultReminder: 30,
  startOnLogin: false,
  showInMenuBar: true,
}

async function loadSettings(): Promise<AppSettings> {
  try {
    const content = await fs.readFile(SETTINGS_PATH, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(content) }
  } catch {
    return defaultSettings
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow
  reminderService.setMainWindow(mainWindow)
  ipcMain.handle('settings:get', async () => {
    return loadSettings()
  })

  ipcMain.handle('settings:set', async (_event, settings: AppSettings) => {
    await saveSettings(settings)
    return settings
  })

  ipcMain.handle('vault:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose vault location',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('vault:init', async (_event, folderPath: string) => {
    await fileService.initializeVault(folderPath)
    const settings = await loadSettings()
    settings.vaultPath = folderPath
    await saveSettings(settings)
    const items = await fileService.loadVault(folderPath)
    reminderService.initialize(items)
    if (mainWindowRef) {
      await fileService.watchVault(mainWindowRef)
    }
    return items
  })

  ipcMain.handle('vault:load', async (_event, folderPath: string) => {
    console.log('[IPC] vault:load called for:', folderPath)
    const items = await fileService.loadVault(folderPath)
    console.log(`[IPC] Loaded ${items.length} items, calling reminderService.initialize`)
    reminderService.initialize(items)
    if (mainWindowRef) {
      await fileService.watchVault(mainWindowRef)
    }
    return items
  })

  ipcMain.handle('vault:config:get', async (_event, folderPath: string) => {
    return fileService.readVaultConfig(folderPath)
  })

  ipcMain.handle('vault:config:set', async (_event, { folderPath, config }: { folderPath: string; config: VaultConfig }) => {
    await fileService.writeVaultConfig(folderPath, config)
    return config
  })

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    return fileService.readFile(filePath)
  })

  ipcMain.handle('file:write', async (_event, { path: filePath, data }: { path: string; data: VaultItem }) => {
    return fileService.writeFile(filePath, data)
  })

  ipcMain.handle('file:forceWrite', async (_event, { path: filePath, data }: { path: string; data: VaultItem }) => {
    await fileService.forceWriteFile(filePath, data)
  })

  ipcMain.handle('file:create', async (_event, { type, folder, title }: { type: string; folder: string; title: string }) => {
    return fileService.createFile(type as ItemType, folder, title)
  })

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    await fileService.deleteFile(filePath)
  })

  ipcMain.handle('directory:delete', async (_event, dirPath: string) => {
    await fileService.deleteDirectory(dirPath)
  })

  ipcMain.handle('directory:rename', async (_event, { oldPath, newName }: { oldPath: string; newName: string }) => {
    return fileService.renameDirectory(oldPath, newName)
  })

  ipcMain.handle('file:move', async (_event, { from, to }: { from: string; to: string }) => {
    await fileService.moveFile(from, to)
  })

  ipcMain.handle('task:complete', async (_event, filePath: string) => {
    const item = await fileService.readFile(filePath)
    if (item && item.meta.type === 'task') {
      item.meta.status = 'completed'
      item.meta.completed_at = new Date().toISOString()
      const result = await fileService.writeFile(filePath, item)
      if (!result.success) {
        return { item: null, conflict: true }
      }
    }
    return { item, conflict: false }
  })
}
