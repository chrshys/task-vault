# TaskVault Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TickTick-style task manager that stores all data as local markdown files optimized for LLM consumption.

**Architecture:** Electron app with React renderer. Main process handles file system operations via chokidar. Renderer displays UI and communicates via IPC. All data stored as markdown with YAML frontmatter.

**Tech Stack:** Electron, React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TipTap, chokidar, gray-matter, date-fns, nanoid

---

## Phase 1: Project Scaffolding

### Task 1.1: Initialize Electron + Vite + React project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`

**Step 1: Create package.json**

```json
{
  "name": "task-vault",
  "version": "0.1.0",
  "description": "A task manager with local markdown storage for LLM compatibility",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "chokidar": "^3.6.0",
    "date-fns": "^3.6.0",
    "gray-matter": "^4.0.3",
    "nanoid": "^5.0.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "concurrently": "^8.2.2",
    "electron": "^31.0.0",
    "electron-builder": "^24.13.3",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "wait-on": "^7.2.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/renderer", "src/shared"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/main", "src/preload", "src/shared", "vite.config.ts"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
})
```

**Step 5: Create electron-builder.json**

```json
{
  "appId": "com.taskvault.app",
  "productName": "TaskVault",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "icon": "resources/icon.png"
  }
}
```

**Step 6: Install dependencies**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm install`
Expected: Dependencies installed, node_modules created

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: initialize project with Electron + Vite + React"
```

---

### Task 1.2: Set up Tailwind CSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/renderer/styles/globals.css`

**Step 1: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 2: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 3: Create src/renderer/styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind CSS"
```

---

### Task 1.3: Create basic Electron main process

**Files:**
- Create: `src/main/index.ts`

**Step 1: Create src/main/index.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Electron main process entry point"
```

---

### Task 1.4: Create preload script

**Files:**
- Create: `src/preload/index.ts`

**Step 1: Create src/preload/index.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

export const api = {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, data: unknown) => ipcRenderer.invoke('file:write', { path, data }),
  createFile: (type: string, folder: string, title: string) =>
    ipcRenderer.invoke('file:create', { type, folder, title }),
  deleteFile: (path: string) => ipcRenderer.invoke('file:delete', path),
  moveFile: (from: string, to: string) => ipcRenderer.invoke('file:move', { from, to }),

  // Vault operations
  selectVaultFolder: () => ipcRenderer.invoke('vault:select'),
  initializeVault: (path: string) => ipcRenderer.invoke('vault:init', path),
  loadVault: (path: string) => ipcRenderer.invoke('vault:load', path),

  // Task operations
  completeTask: (path: string) => ipcRenderer.invoke('task:complete', path),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('settings:set', settings),

  // Event listeners
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
}

contextBridge.exposeInMainWorld('api', api)
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add preload script with IPC bridge"
```

---

### Task 1.5: Create basic React app shell

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`

**Step 1: Create src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
    <title>TaskVault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 2: Create src/renderer/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 3: Create src/renderer/App.tsx**

```tsx
export default function App() {
  return (
    <div className="h-screen flex items-center justify-center bg-background text-foreground">
      <h1 className="text-2xl font-bold">TaskVault</h1>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add basic React app shell"
```

---

### Task 1.6: Add build script for main process

**Files:**
- Modify: `package.json`
- Create: `scripts/build-main.js`

**Step 1: Install esbuild**

Run: `npm install -D esbuild`

**Step 2: Create scripts/build-main.js**

```javascript
import { build } from 'esbuild'

build({
  entryPoints: ['src/main/index.ts', 'src/preload/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outdir: 'dist',
  outbase: 'src',
  format: 'cjs',
}).catch(() => process.exit(1))
```

**Step 3: Update package.json scripts**

Add to scripts section:
```json
{
  "scripts": {
    "build:main": "node scripts/build-main.js",
    "electron:dev": "npm run build:main && concurrently \"vite\" \"wait-on http://localhost:5173 && NODE_ENV=development electron .\""
  }
}
```

**Step 4: Test the dev setup**

Run: `npm run electron:dev`
Expected: Electron window opens with "TaskVault" centered on screen

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: add esbuild for main process compilation"
```

---

## Phase 2: Shared Types

### Task 2.1: Define core types

**Files:**
- Create: `src/shared/types.ts`

**Step 1: Create src/shared/types.ts**

```typescript
export type ItemType = 'folder' | 'project' | 'task' | 'note'
export type TaskStatus = 'pending' | 'completed'
export type RepeatFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RepeatFrom = 'due_date' | 'completion_date'
export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export interface RepeatConfig {
  frequency: RepeatFrequency
  interval: number
  from: RepeatFrom
  days?: DayOfWeek[]
  day_of_month?: number
}

export interface BaseMeta {
  type: ItemType
  created: string
  modified?: string
}

export interface FolderMeta extends BaseMeta {
  type: 'folder'
  name: string
  icon?: string
  color?: string
  sort_order: number
}

export interface ProjectMeta extends BaseMeta {
  type: 'project'
  name: string
  icon?: string
  color?: string
  sort_order: number
}

export interface TaskMeta extends BaseMeta {
  type: 'task'
  status: TaskStatus
  due?: string
  reminder?: string
  repeat?: RepeatConfig | null
  parent?: string | null
  completed_at?: string
  previous_instance?: string
}

export interface NoteMeta extends BaseMeta {
  type: 'note'
  reminder?: string
  repeat?: RepeatConfig | null
  parent?: string | null
}

export type ItemMeta = FolderMeta | ProjectMeta | TaskMeta | NoteMeta

export interface VaultItem {
  id: string
  path: string
  meta: ItemMeta
  content: string
  title: string
}

export interface VaultFolder extends VaultItem {
  meta: FolderMeta
}

export interface VaultProject extends VaultItem {
  meta: ProjectMeta
}

export interface VaultTask extends VaultItem {
  meta: TaskMeta
}

export interface VaultNote extends VaultItem {
  meta: NoteMeta
}

export type VaultItemUnion = VaultFolder | VaultProject | VaultTask | VaultNote

export interface AppSettings {
  vaultPath: string | null
  theme: 'light' | 'dark' | 'system'
  showCompleted: boolean
  defaultReminder: number
  startOnLogin: boolean
  showInMenuBar: boolean
}

export interface VaultConfig {
  version: number
  created: string
}

export type ViewType = 'today' | 'next7' | 'inbox' | 'folder' | 'project'

export interface TreeNode {
  id: string
  name: string
  type: ItemType
  path: string
  children: TreeNode[]
  count?: number
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: define core TypeScript types"
```

---

## Phase 3: Main Process Utilities

### Task 3.1: Create ID generator

**Files:**
- Create: `src/main/utils/id.ts`

**Step 1: Create src/main/utils/id.ts**

```typescript
import { customAlphabet } from 'nanoid'

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 4)

export function generateId(): string {
  return nanoid()
}

export function extractId(filename: string): string | null {
  const match = filename.match(/^([a-z0-9]{4})-/)
  return match ? match[1] : null
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add ID generator utility"
```

---

### Task 3.2: Create slug generator

**Files:**
- Create: `src/main/utils/slug.ts`

**Step 1: Create src/main/utils/slug.ts**

```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export function createFilename(id: string, title: string): string {
  const slug = slugify(title)
  return slug ? `${id}-${slug}.md` : `${id}.md`
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add slug generator utility"
```

---

### Task 3.3: Create frontmatter parser

**Files:**
- Create: `src/main/utils/frontmatter.ts`

**Step 1: Create src/main/utils/frontmatter.ts**

```typescript
import matter from 'gray-matter'
import type { ItemMeta, VaultItem } from '@shared/types'
import { extractId } from './id'
import path from 'path'

export function parseFile(filePath: string, fileContent: string): VaultItem | null {
  try {
    const { data, content } = matter(fileContent)
    const meta = data as ItemMeta
    const filename = path.basename(filePath)
    const id = extractId(filename) || filename.replace('.md', '')

    // Extract title from first heading or filename
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim() : meta.type === 'folder' || meta.type === 'project'
      ? (meta as { name: string }).name
      : filename.replace(/^[a-z0-9]{4}-/, '').replace('.md', '').replace(/-/g, ' ')

    // Remove title from content for tasks/notes
    const bodyContent = titleMatch
      ? content.replace(/^#\s+.+\n*/, '').trim()
      : content.trim()

    return {
      id,
      path: filePath,
      meta,
      content: bodyContent,
      title,
    }
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error)
    return null
  }
}

export function serializeFile(item: VaultItem): string {
  const { meta, content, title } = item

  // For tasks and notes, include title as heading
  const body = meta.type === 'task' || meta.type === 'note'
    ? `# ${title}\n\n${content}`
    : content

  return matter.stringify(body, meta)
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add frontmatter parser utility"
```

---

## Phase 4: File Service

### Task 4.1: Create file service core

**Files:**
- Create: `src/main/services/file-service.ts`

**Step 1: Create src/main/services/file-service.ts**

```typescript
import { BrowserWindow } from 'electron'
import chokidar, { FSWatcher } from 'chokidar'
import fs from 'fs/promises'
import path from 'path'
import type { ItemType, VaultItem, VaultConfig, FolderMeta, ProjectMeta, TaskMeta, NoteMeta } from '@shared/types'
import { parseFile, serializeFile } from '../utils/frontmatter'
import { generateId } from '../utils/id'
import { createFilename } from '../utils/slug'

let watcher: FSWatcher | null = null
let vaultPath: string | null = null

export function getVaultPath(): string | null {
  return vaultPath
}

export async function initializeVault(folderPath: string): Promise<void> {
  vaultPath = folderPath

  // Create .vault.json
  const config: VaultConfig = {
    version: 1,
    created: new Date().toISOString(),
  }
  await fs.writeFile(
    path.join(folderPath, '.vault.json'),
    JSON.stringify(config, null, 2)
  )

  // Create Inbox folder
  const inboxPath = path.join(folderPath, 'Inbox')
  await fs.mkdir(inboxPath, { recursive: true })

  const inboxMeta: FolderMeta = {
    type: 'folder',
    name: 'Inbox',
    sort_order: 0,
    created: new Date().toISOString(),
  }

  await fs.writeFile(
    path.join(inboxPath, '_folder.md'),
    serializeFile({
      id: 'inbox',
      path: path.join(inboxPath, '_folder.md'),
      meta: inboxMeta,
      content: '',
      title: 'Inbox',
    })
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
    ignored: /(^|[\/\\])\../,
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
  await fs.writeFile(filePath, content)
}

export async function createFile(
  type: ItemType,
  folder: string,
  title: string
): Promise<VaultItem> {
  const id = generateId()
  const now = new Date().toISOString()

  let meta: FolderMeta | ProjectMeta | TaskMeta | NoteMeta
  let filename: string

  switch (type) {
    case 'folder':
      meta = { type: 'folder', name: title, sort_order: 0, created: now }
      filename = '_folder.md'
      folder = path.join(folder, title)
      await fs.mkdir(folder, { recursive: true })
      break
    case 'project':
      meta = { type: 'project', name: title, sort_order: 0, created: now }
      filename = '_project.md'
      folder = path.join(folder, title)
      await fs.mkdir(folder, { recursive: true })
      break
    case 'task':
      meta = { type: 'task', status: 'pending', parent: null, repeat: null, created: now, modified: now }
      filename = createFilename(id, title)
      break
    case 'note':
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

export async function moveFile(from: string, to: string): Promise<void> {
  await fs.rename(from, to)
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add file service with CRUD operations and watching"
```

---

## Phase 5: IPC Handlers

### Task 5.1: Set up IPC handlers

**Files:**
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`

**Step 1: Create src/main/ipc.ts**

```typescript
import { ipcMain, dialog, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import type { AppSettings, VaultItem } from '@shared/types'
import * as fileService from './services/file-service'

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

export function registerIpcHandlers(): void {
  // Settings
  ipcMain.handle('settings:get', async () => {
    return loadSettings()
  })

  ipcMain.handle('settings:set', async (_event, settings: AppSettings) => {
    await saveSettings(settings)
    return settings
  })

  // Vault operations
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
    return fileService.loadVault(folderPath)
  })

  ipcMain.handle('vault:load', async (_event, folderPath: string) => {
    return fileService.loadVault(folderPath)
  })

  // File operations
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    return fileService.readFile(filePath)
  })

  ipcMain.handle('file:write', async (_event, { path: filePath, data }: { path: string; data: VaultItem }) => {
    await fileService.writeFile(filePath, data)
  })

  ipcMain.handle('file:create', async (_event, { type, folder, title }: { type: string; folder: string; title: string }) => {
    return fileService.createFile(type as any, folder, title)
  })

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    await fileService.deleteFile(filePath)
  })

  ipcMain.handle('file:move', async (_event, { from, to }: { from: string; to: string }) => {
    await fileService.moveFile(from, to)
  })

  // Task operations
  ipcMain.handle('task:complete', async (_event, filePath: string) => {
    // This will be implemented in the repeat service task
    const item = await fileService.readFile(filePath)
    if (item && item.meta.type === 'task') {
      item.meta.status = 'completed'
      item.meta.completed_at = new Date().toISOString()
      await fileService.writeFile(filePath, item)
    }
    return item
  })
}
```

**Step 2: Update src/main/index.ts to register handlers**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc'
import { watchVault, stopWatching, getVaultPath } from './services/file-service'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && getVaultPath()) {
      watchVault(mainWindow)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    stopWatching()
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add IPC handlers for file and vault operations"
```

---

## Phase 6: Renderer Foundation

### Task 6.1: Add API type declarations

**Files:**
- Create: `src/renderer/types/api.d.ts`

**Step 1: Create src/renderer/types/api.d.ts**

```typescript
import type { VaultItem, AppSettings } from '@shared/types'

export interface API {
  readFile: (path: string) => Promise<VaultItem | null>
  writeFile: (path: string, data: VaultItem) => Promise<void>
  createFile: (type: string, folder: string, title: string) => Promise<VaultItem>
  deleteFile: (path: string) => Promise<void>
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
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add API type declarations for renderer"
```

---

### Task 6.2: Create VaultContext

**Files:**
- Create: `src/renderer/contexts/VaultContext.tsx`

**Step 1: Create src/renderer/contexts/VaultContext.tsx**

```tsx
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { VaultItem, TreeNode, ItemType } from '@shared/types'
import path from 'path-browserify'

interface VaultContextValue {
  items: Map<string, VaultItem>
  tree: TreeNode[]
  loading: boolean
  vaultPath: string | null
  loadVault: (path: string) => Promise<void>
  initializeVault: (path: string) => Promise<void>
  createItem: (type: ItemType, folder: string, title: string) => Promise<VaultItem>
  updateItem: (item: VaultItem) => Promise<void>
  deleteItem: (path: string) => Promise<void>
  getItemsByParent: (parentId: string | null) => VaultItem[]
  getTodayTasks: () => VaultItem[]
  getNext7DaysTasks: () => VaultItem[]
  getInboxItems: () => VaultItem[]
}

const VaultContext = createContext<VaultContextValue | null>(null)

function buildTree(items: Map<string, VaultItem>, vaultPath: string): TreeNode[] {
  const tree: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()

  // First pass: create nodes for folders and projects
  items.forEach((item) => {
    if (item.meta.type === 'folder' || item.meta.type === 'project') {
      const dirPath = path.dirname(item.path)
      const node: TreeNode = {
        id: item.id,
        name: item.title,
        type: item.meta.type,
        path: item.meta.type === 'folder' ? dirPath : dirPath,
        children: [],
        count: 0,
      }
      folderMap.set(dirPath, node)
    }
  })

  // Second pass: build hierarchy and count tasks
  items.forEach((item) => {
    if (item.meta.type === 'task' || item.meta.type === 'note') {
      const dirPath = path.dirname(item.path)
      const parentNode = folderMap.get(dirPath)
      if (parentNode) {
        parentNode.count = (parentNode.count || 0) + 1
      }
    }
  })

  // Third pass: nest folders
  folderMap.forEach((node, nodePath) => {
    const parentPath = path.dirname(nodePath)
    const parentNode = folderMap.get(parentPath)

    if (parentNode && parentPath !== nodePath) {
      parentNode.children.push(node)
    } else if (nodePath !== vaultPath) {
      tree.push(node)
    }
  })

  return tree.sort((a, b) => a.name.localeCompare(b.name))
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, VaultItem>>(new Map())
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [vaultPath, setVaultPath] = useState<string | null>(null)

  const rebuildTree = useCallback((itemsMap: Map<string, VaultItem>, vault: string) => {
    setTree(buildTree(itemsMap, vault))
  }, [])

  const loadVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.loadVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap, folderPath)
    setLoading(false)
  }, [rebuildTree])

  const initializeVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.initializeVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap, folderPath)
    setLoading(false)
  }, [rebuildTree])

  const createItem = useCallback(async (type: ItemType, folder: string, title: string) => {
    const item = await window.api.createFile(type, folder, title)
    setItems(prev => {
      const next = new Map(prev)
      next.set(item.id, item)
      if (vaultPath) rebuildTree(next, vaultPath)
      return next
    })
    return item
  }, [vaultPath, rebuildTree])

  const updateItem = useCallback(async (item: VaultItem) => {
    await window.api.writeFile(item.path, item)
  }, [])

  const deleteItem = useCallback(async (itemPath: string) => {
    await window.api.deleteFile(itemPath)
  }, [])

  const getItemsByParent = useCallback((parentId: string | null) => {
    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'task' || item.meta.type === 'note') {
        return item.meta.parent === parentId
      }
      return false
    })
  }, [items])

  const getTodayTasks = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      if (item.meta.status === 'completed') return false
      if (!item.meta.due) return false
      const due = new Date(item.meta.due)
      return due >= today && due < tomorrow
    })
  }, [items])

  const getNext7DaysTasks = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)

    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      if (item.meta.status === 'completed') return false
      if (!item.meta.due) return false
      const due = new Date(item.meta.due)
      return due >= today && due < next7
    })
  }, [items])

  const getInboxItems = useCallback(() => {
    if (!vaultPath) return []
    const inboxPath = path.join(vaultPath, 'Inbox')

    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'folder' || item.meta.type === 'project') return false
      return item.path.startsWith(inboxPath)
    })
  }, [items, vaultPath])

  // Listen for file system changes
  useEffect(() => {
    const unsubChanged = window.api.onFileChanged((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        if (vaultPath) rebuildTree(next, vaultPath)
        return next
      })
    })

    const unsubAdded = window.api.onFileAdded((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        if (vaultPath) rebuildTree(next, vaultPath)
        return next
      })
    })

    const unsubDeleted = window.api.onFileDeleted((deletedPath) => {
      setItems(prev => {
        const next = new Map(prev)
        for (const [id, item] of next) {
          if (item.path === deletedPath) {
            next.delete(id)
            break
          }
        }
        if (vaultPath) rebuildTree(next, vaultPath)
        return next
      })
    })

    return () => {
      unsubChanged()
      unsubAdded()
      unsubDeleted()
    }
  }, [vaultPath, rebuildTree])

  return (
    <VaultContext.Provider
      value={{
        items,
        tree,
        loading,
        vaultPath,
        loadVault,
        initializeVault,
        createItem,
        updateItem,
        deleteItem,
        getItemsByParent,
        getTodayTasks,
        getNext7DaysTasks,
        getInboxItems,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}
```

**Step 2: Install path-browserify**

Run: `npm install path-browserify && npm install -D @types/path-browserify`

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add VaultContext for state management"
```

---

### Task 6.3: Create UIContext

**Files:**
- Create: `src/renderer/contexts/UIContext.tsx`

**Step 1: Create src/renderer/contexts/UIContext.tsx**

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ViewType } from '@shared/types'

interface UIContextValue {
  selectedView: ViewType
  selectedPath: string | null
  selectedTaskId: string | null
  sidebarCollapsed: boolean
  setSelectedView: (view: ViewType, path?: string) => void
  setSelectedTaskId: (id: string | null) => void
  toggleSidebar: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedView, setSelectedViewState] = useState<ViewType>('inbox')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const setSelectedView = useCallback((view: ViewType, path?: string) => {
    setSelectedViewState(view)
    setSelectedPath(path || null)
    setSelectedTaskId(null)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  return (
    <UIContext.Provider
      value={{
        selectedView,
        selectedPath,
        selectedTaskId,
        sidebarCollapsed,
        setSelectedView,
        setSelectedTaskId,
        toggleSidebar,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add UIContext for UI state management"
```

---

### Task 6.4: Create Welcome screen

**Files:**
- Create: `src/renderer/components/Welcome.tsx`

**Step 1: Create src/renderer/components/Welcome.tsx**

```tsx
import { useVault } from '../contexts/VaultContext'

export function Welcome() {
  const { initializeVault, loadVault } = useVault()

  const handleCreate = async () => {
    const folderPath = await window.api.selectVaultFolder()
    if (folderPath) {
      await initializeVault(folderPath)
    }
  }

  const handleOpen = async () => {
    const folderPath = await window.api.selectVaultFolder()
    if (folderPath) {
      await loadVault(folderPath)
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-8 bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">TaskVault</h1>
        <p className="text-muted-foreground">
          A task manager with local markdown storage
        </p>
      </div>

      <div className="flex flex-col gap-4 w-64">
        <button
          onClick={handleCreate}
          className="px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Create New Vault
        </button>
        <button
          onClick={handleOpen}
          className="px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Open Existing Vault
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Welcome screen component"
```

---

### Task 6.5: Update App.tsx with providers and routing

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Update src/renderer/App.tsx**

```tsx
import { useEffect, useState } from 'react'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider } from './contexts/UIContext'
import { Welcome } from './components/Welcome'
import type { AppSettings } from '@shared/types'

function AppContent() {
  const { vaultPath, loadVault, loading } = useVault()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const settings: AppSettings = await window.api.getSettings()
      if (settings.vaultPath) {
        await loadVault(settings.vaultPath)
      }
      setInitialized(true)
    }
    init()
  }, [loadVault])

  if (!initialized || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!vaultPath) {
    return <Welcome />
  }

  return (
    <div className="h-screen flex bg-background text-foreground">
      <div className="w-64 border-r border-border p-4">
        Sidebar placeholder
      </div>
      <div className="flex-1 p-4">
        Main content placeholder
      </div>
    </div>
  )
}

export default function App() {
  return (
    <VaultProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </VaultProvider>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: wire up App with providers and Welcome screen"
```

---

## Phase 7: UI Components

### Task 7.1: Create Sidebar component

**Files:**
- Create: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Create src/renderer/components/layout/Sidebar.tsx**

```tsx
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import type { TreeNode } from '@shared/types'

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const { setSelectedView } = useUI()

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent text-sm"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <span className="flex items-center gap-2">
          <span>{node.type === 'folder' ? '📁' : '≡'}</span>
          <span>{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-muted-foreground text-xs">{node.count}</span>
        )}
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { tree, getTodayTasks, getNext7DaysTasks, getInboxItems } = useVault()
  const { selectedView, setSelectedView } = useUI()

  const todayCount = getTodayTasks().length
  const next7Count = getNext7DaysTasks().length
  const inboxCount = getInboxItems().length

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="font-semibold">TaskVault</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <button
            onClick={() => setSelectedView('today')}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
              selectedView === 'today' ? 'bg-accent' : 'hover:bg-accent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📅</span>
              <span>Today</span>
            </span>
            {todayCount > 0 && (
              <span className="text-muted-foreground text-xs">{todayCount}</span>
            )}
          </button>

          <button
            onClick={() => setSelectedView('next7')}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
              selectedView === 'next7' ? 'bg-accent' : 'hover:bg-accent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📆</span>
              <span>Next 7 Days</span>
            </span>
            {next7Count > 0 && (
              <span className="text-muted-foreground text-xs">{next7Count}</span>
            )}
          </button>

          <button
            onClick={() => setSelectedView('inbox')}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
              selectedView === 'inbox' ? 'bg-accent' : 'hover:bg-accent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📥</span>
              <span>Inbox</span>
            </span>
            {inboxCount > 0 && (
              <span className="text-muted-foreground text-xs">{inboxCount}</span>
            )}
          </button>
        </div>

        <div className="border-t border-border pt-2">
          <p className="px-2 py-1 text-xs text-muted-foreground uppercase tracking-wide">
            Lists
          </p>
          {tree.map((node) => (
            <TreeItem key={node.id} node={node} />
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-border">
        <button className="w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground text-left">
          + New Folder
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Sidebar component with navigation"
```

---

### Task 7.2: Create TaskList component

**Files:**
- Create: `src/renderer/components/layout/TaskList.tsx`
- Create: `src/renderer/components/task/TaskRow.tsx`

**Step 1: Create src/renderer/components/task/TaskRow.tsx**

```tsx
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import type { VaultItem } from '@shared/types'
import { useUI } from '../../contexts/UIContext'

interface TaskRowProps {
  item: VaultItem
  onToggleComplete: (item: VaultItem) => void
}

function formatDueDate(due: string): string {
  const date = new Date(due)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function TaskRow({ item, onToggleComplete }: TaskRowProps) {
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const isSelected = selectedTaskId === item.id
  const isTask = item.meta.type === 'task'
  const isCompleted = isTask && item.meta.status === 'completed'
  const due = isTask ? item.meta.due : undefined
  const isOverdue = due && isPast(new Date(due)) && !isCompleted

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
      }`}
      onClick={() => setSelectedTaskId(item.id)}
    >
      {isTask && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete(item)
          }}
          className={`w-5 h-5 rounded border flex items-center justify-center ${
            isCompleted
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border hover:border-primary'
          }`}
        >
          {isCompleted && <span className="text-xs">✓</span>}
        </button>
      )}

      {!isTask && (
        <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">
          📄
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
          {item.title}
        </p>
        {item.content && (
          <p className="text-xs text-muted-foreground truncate">
            {item.content.slice(0, 60)}
          </p>
        )}
      </div>

      {due && !isCompleted && (
        <span className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
          {formatDueDate(due)}
        </span>
      )}
    </div>
  )
}
```

**Step 2: Create src/renderer/components/layout/TaskList.tsx**

```tsx
import { useMemo, useState } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { TaskRow } from '../task/TaskRow'
import type { VaultItem } from '@shared/types'
import path from 'path-browserify'

export function TaskList() {
  const { items, vaultPath, getTodayTasks, getNext7DaysTasks, getInboxItems, createItem, updateItem } = useVault()
  const { selectedView, selectedPath } = useUI()
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const displayItems = useMemo(() => {
    switch (selectedView) {
      case 'today':
        return getTodayTasks()
      case 'next7':
        return getNext7DaysTasks()
      case 'inbox':
        return getInboxItems()
      case 'folder':
      case 'project':
        if (!selectedPath) return []
        return Array.from(items.values()).filter(item => {
          if (item.meta.type === 'folder' || item.meta.type === 'project') return false
          return path.dirname(item.path) === selectedPath
        })
      default:
        return []
    }
  }, [selectedView, selectedPath, items, getTodayTasks, getNext7DaysTasks, getInboxItems])

  const viewTitle = useMemo(() => {
    switch (selectedView) {
      case 'today': return 'Today'
      case 'next7': return 'Next 7 Days'
      case 'inbox': return 'Inbox'
      case 'folder':
      case 'project':
        if (!selectedPath) return ''
        return path.basename(selectedPath)
      default:
        return ''
    }
  }, [selectedView, selectedPath])

  const handleToggleComplete = async (item: VaultItem) => {
    if (item.meta.type !== 'task') return

    const updatedItem: VaultItem = {
      ...item,
      meta: {
        ...item.meta,
        status: item.meta.status === 'completed' ? 'pending' : 'completed',
        completed_at: item.meta.status === 'pending' ? new Date().toISOString() : undefined,
      },
    }
    await updateItem(updatedItem)
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const folder = selectedPath || (vaultPath ? path.join(vaultPath, 'Inbox') : null)
    if (!folder) return

    await createItem('task', folder, newTaskTitle.trim())
    setNewTaskTitle('')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">{viewTitle}</h2>
      </div>

      <div className="p-2 border-b border-border">
        <form onSubmit={handleCreateTask}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="+ Add task"
            className="w-full px-3 py-2 bg-transparent border border-transparent rounded text-sm placeholder:text-muted-foreground focus:outline-none focus:border-border"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {displayItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tasks</p>
        ) : (
          displayItems.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              onToggleComplete={handleToggleComplete}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add TaskList and TaskRow components"
```

---

### Task 7.3: Create TaskDetail component

**Files:**
- Create: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1: Create src/renderer/components/layout/TaskDetail.tsx**

```tsx
import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import type { VaultItem, TaskMeta } from '@shared/types'

export function TaskDetail() {
  const { items, updateItem, deleteItem } = useVault()
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const [localItem, setLocalItem] = useState<VaultItem | null>(null)

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null

  useEffect(() => {
    setLocalItem(selectedItem || null)
  }, [selectedItem])

  const handleSave = useCallback(async () => {
    if (!localItem) return
    await updateItem(localItem)
  }, [localItem, updateItem])

  // Debounced save
  useEffect(() => {
    if (!localItem || localItem === selectedItem) return
    const timeout = setTimeout(handleSave, 300)
    return () => clearTimeout(timeout)
  }, [localItem, selectedItem, handleSave])

  const handleDelete = async () => {
    if (!selectedItem) return
    await deleteItem(selectedItem.path)
    setSelectedTaskId(null)
  }

  const handleTitleChange = (title: string) => {
    if (!localItem) return
    setLocalItem({ ...localItem, title })
  }

  const handleContentChange = (content: string) => {
    if (!localItem) return
    setLocalItem({ ...localItem, content })
  }

  const handleDueChange = (due: string) => {
    if (!localItem || localItem.meta.type !== 'task') return
    setLocalItem({
      ...localItem,
      meta: { ...localItem.meta, due: due || undefined } as TaskMeta,
    })
  }

  if (!localItem) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a task to view details
      </div>
    )
  }

  const isTask = localItem.meta.type === 'task'
  const due = isTask ? (localItem.meta as TaskMeta).due : undefined

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <button
          onClick={() => setSelectedTaskId(null)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
        <button
          onClick={handleDelete}
          className="text-sm text-destructive hover:opacity-80"
        >
          Delete
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <input
          type="text"
          value={localItem.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-xl font-semibold bg-transparent border-none outline-none mb-4"
          placeholder="Task title"
        />

        {isTask && (
          <div className="flex gap-2 mb-4">
            <input
              type="datetime-local"
              value={due ? format(new Date(due), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => handleDueChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="px-3 py-2 bg-secondary rounded text-sm"
            />
          </div>
        )}

        <textarea
          value={localItem.content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full h-64 bg-transparent border border-border rounded p-3 text-sm resize-none outline-none focus:border-ring"
          placeholder="Add description..."
        />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add TaskDetail component"
```

---

### Task 7.4: Wire up main layout

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Update src/renderer/App.tsx**

```tsx
import { useEffect, useState } from 'react'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider, useUI } from './contexts/UIContext'
import { Welcome } from './components/Welcome'
import { Sidebar } from './components/layout/Sidebar'
import { TaskList } from './components/layout/TaskList'
import { TaskDetail } from './components/layout/TaskDetail'
import type { AppSettings } from '@shared/types'

function MainLayout() {
  const { selectedTaskId } = useUI()

  return (
    <div className="h-screen flex bg-background text-foreground">
      <div className="w-64 border-r border-border flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex">
        <div className={`${selectedTaskId ? 'w-1/2' : 'flex-1'} border-r border-border`}>
          <TaskList />
        </div>
        {selectedTaskId && (
          <div className="w-1/2">
            <TaskDetail />
          </div>
        )}
      </div>
    </div>
  )
}

function AppContent() {
  const { vaultPath, loadVault, loading } = useVault()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const settings: AppSettings = await window.api.getSettings()
      if (settings.vaultPath) {
        await loadVault(settings.vaultPath)
      }
      setInitialized(true)
    }
    init()
  }, [loadVault])

  if (!initialized || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!vaultPath) {
    return <Welcome />
  }

  return <MainLayout />
}

export default function App() {
  return (
    <VaultProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </VaultProvider>
  )
}
```

**Step 2: Test the application**

Run: `npm run electron:dev`
Expected: App opens with welcome screen, can create vault, see sidebar and task list

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: wire up main three-panel layout"
```

---

## Phase 8: Remaining Implementation

The following phases cover the remaining features. Due to the document length, I'll summarize the remaining tasks:

### Task 8.1: Add TipTap editor integration
- Install `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`
- Create `src/renderer/components/editor/TipTapEditor.tsx`
- Replace textarea in TaskDetail with TipTap
- Add markdown serialization/deserialization

### Task 8.2: Add date/time pickers
- Create `src/renderer/components/pickers/DatePicker.tsx`
- Create `src/renderer/components/pickers/TimePicker.tsx`
- Create `src/renderer/components/pickers/ReminderPicker.tsx`
- Create `src/renderer/components/pickers/RepeatPicker.tsx`

### Task 8.3: Add reminder service
- Create `src/main/services/reminder-service.ts`
- Implement notification scheduling
- Wire up to IPC handlers

### Task 8.4: Add repeat service
- Create `src/main/services/repeat-service.ts`
- Implement next due date calculation
- Handle task completion with repeat

### Task 8.5: Add tray/menu bar
- Create `src/main/tray.ts`
- Implement menu bar icon
- Add context menu
- Keep app running in background

### Task 8.6: Add theme support
- Detect system theme
- Add theme toggle in settings
- Persist theme preference

### Task 8.7: Add keyboard shortcuts
- `Cmd+N` for new task
- `Cmd+Shift+N` for new note
- `Cmd+Backspace` for delete
- `Escape` to deselect

### Task 8.8: Add drag and drop
- Implement task reordering
- Implement moving tasks between projects

### Task 8.9: Add subtask support
- Display subtasks in TaskDetail
- Create subtask functionality
- Show subtask count in TaskRow

### Task 8.10: Final polish
- Add loading states
- Add error handling
- Add empty states
- Performance optimization

---

## Execution Notes

- Each task should be committed separately
- Run the app after each major feature to verify it works
- Write tests for utilities (id, slug, frontmatter parsing)
- The TipTap integration is the most complex UI task
- The repeat service has the most complex logic

---

**Plan complete and saved to `docs/plans/2026-01-12-task-vault-implementation.md`.**
