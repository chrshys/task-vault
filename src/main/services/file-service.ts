import { BrowserWindow } from 'electron'
import chokidar, { FSWatcher } from 'chokidar'
import fs from 'fs/promises'
import path from 'path'
import type { ItemType, VaultItem, VaultConfig, ProjectMeta, TaskMeta, NoteMeta } from '../../shared/types'
import { parseFile, serializeFile } from '../utils/frontmatter'
import { generateId } from '../utils/id'
import { createFilename } from '../utils/slug'

const VAULT_CONFIG_FILENAME = '.vault.json'
const DEFAULT_SECTION_NAME = 'Projects'

let watcher: FSWatcher | null = null
let vaultPath: string | null = null

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
  const items: VaultItem[] = []

  async function scanDirectory(dirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scanDirectory(fullPath)
      } else if (entry.name.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf-8')
        const item = parseFile(fullPath, content)
        if (item) {
          items.push(item)
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
    const content = await fs.readFile(filePath, 'utf-8')
    const item = parseFile(filePath, content)
    if (item) {
      mainWindow.webContents.send('file:changed', item)
    }
  })

  watcher.on('add', async (filePath) => {
    const content = await fs.readFile(filePath, 'utf-8')
    const item = parseFile(filePath, content)
    if (item) {
      mainWindow.webContents.send('file:added', item)
    }
  })

  watcher.on('unlink', (filePath) => {
    mainWindow.webContents.send('file:deleted', filePath)
  })
}

export async function readFile(filePath: string): Promise<VaultItem | null> {
  const content = await fs.readFile(filePath, 'utf-8')
  return parseFile(filePath, content)
}

export async function writeFile(filePath: string, item: VaultItem): Promise<void> {
  const content = serializeFile(item)
  // Ensure parent directory exists (for move operations)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
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

  await writeFile(filePath, item)
  return item
}

export async function deleteFile(filePath: string): Promise<void> {
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
  await fs.rename(from, to)
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
