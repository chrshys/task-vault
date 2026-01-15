import { BrowserWindow } from 'electron'
import chokidar, { FSWatcher } from 'chokidar'
import fs from 'fs/promises'
import path from 'path'
import type { ItemType, VaultItem, VaultConfig, ProjectMeta, TaskMeta, NoteMeta } from '../../shared/types'
import { parseFile, serializeFile } from '../utils/frontmatter'
import * as reminderService from './reminder-service'
import { generateId } from '../utils/id'
import { createFilename } from '../utils/slug'

const VAULT_CONFIG_FILENAME = '.vault.json'
const DEFAULT_SECTION_NAME = 'Projects'
const WRITE_IGNORE_MS = 100

let watcher: FSWatcher | null = null
let vaultPath: string | null = null

// Track paths we've recently written to, so chokidar ignores our own changes
const recentWrites = new Set<string>()

// Track file mtimes for conflict detection
const fileMtimes = new Map<string, number>()

export type WriteResult = { success: true } | { success: false; conflict: true }

async function getFileMtime(filePath: string): Promise<number | null> {
  try {
    const stat = await fs.stat(filePath)
    return stat.mtimeMs
  } catch {
    return null
  }
}

function updateTrackedMtime(filePath: string, mtime: number): void {
  fileMtimes.set(filePath, mtime)
}

function clearTrackedMtime(filePath: string): void {
  fileMtimes.delete(filePath)
}

function markAsOwnWrite(filePath: string): void {
  recentWrites.add(filePath)
  setTimeout(() => recentWrites.delete(filePath), WRITE_IGNORE_MS)
}

function isOwnWrite(filePath: string): boolean {
  return recentWrites.has(filePath)
}

export function getVaultPath(): string | null {
  return vaultPath
}

export async function initializeVault(folderPath: string): Promise<void> {
  vaultPath = folderPath

  const config: VaultConfig = {
    version: 1,
    created: new Date().toISOString(),
    sections: [],
    defaultSectionName: DEFAULT_SECTION_NAME,
  }
  await fs.writeFile(
    path.join(folderPath, VAULT_CONFIG_FILENAME),
    JSON.stringify(config, null, 2)
  )

  // Create Inbox directory (no project marker - it's a special system folder)
  const inboxPath = path.join(folderPath, 'Inbox')
  await fs.mkdir(inboxPath, { recursive: true })
}

export async function readVaultConfig(folderPath: string): Promise<VaultConfig> {
  try {
    const content = await fs.readFile(path.join(folderPath, VAULT_CONFIG_FILENAME), 'utf-8')
    const parsed = JSON.parse(content) as VaultConfig
    return {
      version: parsed.version ?? 1,
      created: parsed.created ?? new Date().toISOString(),
      sections: parsed.sections ?? [],
      defaultSectionName: parsed.defaultSectionName ?? DEFAULT_SECTION_NAME,
    }
  } catch {
    return { version: 1, created: new Date().toISOString(), sections: [], defaultSectionName: DEFAULT_SECTION_NAME }
  }
}

export async function writeVaultConfig(folderPath: string, config: VaultConfig): Promise<void> {
  await fs.writeFile(
    path.join(folderPath, VAULT_CONFIG_FILENAME),
    JSON.stringify(config, null, 2)
  )
}

export async function loadVault(folderPath: string): Promise<VaultItem[]> {
  vaultPath = folderPath
  fileMtimes.clear()
  const items: VaultItem[] = []

  async function scanDirectory(dirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scanDirectory(fullPath)
      } else if (entry.name.endsWith('.md')) {
        const [content, stat] = await Promise.all([
          fs.readFile(fullPath, 'utf-8'),
          fs.stat(fullPath),
        ])
        const item = parseFile(fullPath, content)
        if (item) {
          items.push(item)
          updateTrackedMtime(fullPath, stat.mtimeMs)
        }
      }
    }
  }

  await scanDirectory(folderPath)
  return items
}

export async function watchVault(mainWindow: BrowserWindow): Promise<void> {
  if (!vaultPath) return

  if (watcher) {
    await watcher.close()
  }

  watcher = chokidar.watch(path.join(vaultPath, '**/*.md'), {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
  })

  watcher.on('change', async (filePath) => {
    if (isOwnWrite(filePath)) return
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ])
    const item = parseFile(filePath, content)
    if (item) {
      updateTrackedMtime(filePath, stat.mtimeMs)
      mainWindow.webContents.send('file:changed', item)
      reminderService.handleFileChange(item)
    }
  })

  watcher.on('add', async (filePath) => {
    if (isOwnWrite(filePath)) return
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ])
    const item = parseFile(filePath, content)
    if (item) {
      updateTrackedMtime(filePath, stat.mtimeMs)
      mainWindow.webContents.send('file:added', item)
      reminderService.handleFileChange(item)
    }
  })

  watcher.on('unlink', (filePath) => {
    if (isOwnWrite(filePath)) return
    clearTrackedMtime(filePath)
    mainWindow.webContents.send('file:deleted', filePath)
    // Extract task ID from path for reminder cancellation
    const filename = path.basename(filePath, '.md')
    const idMatch = filename.match(/^([a-z0-9]{4})-/)
    if (idMatch) {
      reminderService.handleFileDelete(idMatch[1])
    }
  })
}

export async function readFile(filePath: string): Promise<VaultItem | null> {
  const [content, stat] = await Promise.all([
    fs.readFile(filePath, 'utf-8'),
    fs.stat(filePath),
  ])
  const item = parseFile(filePath, content)
  if (item) {
    updateTrackedMtime(filePath, stat.mtimeMs)
  }
  return item
}

export async function writeFile(filePath: string, item: VaultItem): Promise<WriteResult> {
  // Check for conflict: if we have a tracked mtime, verify file hasn't changed
  const trackedMtime = fileMtimes.get(filePath)
  if (trackedMtime !== undefined) {
    const currentMtime = await getFileMtime(filePath)
    if (currentMtime !== null && currentMtime !== trackedMtime) {
      return { success: false, conflict: true }
    }
  }

  const content = serializeFile(item)
  // Ensure parent directory exists (for move operations)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  markAsOwnWrite(filePath)
  await fs.writeFile(filePath, content)

  // Update tracked mtime after successful write
  const newMtime = await getFileMtime(filePath)
  if (newMtime !== null) {
    updateTrackedMtime(filePath, newMtime)
  }

  return { success: true }
}

export async function forceWriteFile(filePath: string, item: VaultItem): Promise<void> {
  const content = serializeFile(item)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  markAsOwnWrite(filePath)
  await fs.writeFile(filePath, content)

  // Update tracked mtime after write
  const newMtime = await getFileMtime(filePath)
  if (newMtime !== null) {
    updateTrackedMtime(filePath, newMtime)
  }
}

export async function createFile(
  type: ItemType,
  folder: string,
  title: string
): Promise<VaultItem> {
  const now = new Date().toISOString()

  let meta: ProjectMeta | TaskMeta | NoteMeta
  let filename: string
  let id: string

  switch (type) {
    case 'project':
      meta = { type: 'project', name: title, created: now }
      filename = '_project.md'
      folder = path.join(folder, title)
      await fs.mkdir(folder, { recursive: true })
      // For projects, use the directory path as ID (guaranteed unique)
      id = folder
      break
    case 'task':
      id = generateId()
      meta = { type: 'task', status: 'pending', parent: null, repeat: null, created: now, modified: now }
      filename = createFilename(id, title)
      break
    case 'note':
      id = generateId()
      meta = { type: 'note', parent: null, repeat: null, created: now, modified: now }
      filename = createFilename(id, title)
      break
  }

  const filePath = path.join(folder, filename)
  const item: VaultItem = { id, path: filePath, meta, content: '', title }

  // New files can't have conflicts, use force write
  await forceWriteFile(filePath, item)
  return item
}

export async function deleteFile(filePath: string): Promise<void> {
  markAsOwnWrite(filePath)
  clearTrackedMtime(filePath)
  await fs.unlink(filePath)
}

export async function deleteDirectory(dirPath: string): Promise<void> {
  // Remove directory and all contents recursively
  await fs.rm(dirPath, { recursive: true, force: true })
}

export async function renameDirectory(oldPath: string, newName: string): Promise<string> {
  const parentDir = path.dirname(oldPath)
  const newPath = path.join(parentDir, newName)
  await fs.rename(oldPath, newPath)
  return newPath
}

export async function moveFile(from: string, to: string): Promise<void> {
  markAsOwnWrite(from)
  markAsOwnWrite(to)
  await fs.rename(from, to)
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
