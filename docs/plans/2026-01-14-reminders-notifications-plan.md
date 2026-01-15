# Reminders v1 - Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fire system notifications when task reminders are due, with click-to-navigate functionality.

**Architecture:** ReminderService in main process schedules in-memory timers, fires Electron notifications, clears reminders from task files, and sends IPC events to renderer for navigation.

**Tech Stack:** Electron Notification API, IPC, existing file-service patterns

---

## Task 1: Create ReminderService

**Files:**
- Create: `src/main/services/reminder-service.ts`

**Step 1: Create the service file with types and state**

```typescript
import { Notification, BrowserWindow } from 'electron'
import type { VaultItem, TaskMeta } from '../../shared/types'
import * as fileService from './file-service'

type ReminderTask = VaultItem & { meta: TaskMeta }

let mainWindowRef: BrowserWindow | null = null
const timers = new Map<string, NodeJS.Timeout>()
```

**Step 2: Add setMainWindow function**

```typescript
export function setMainWindow(window: BrowserWindow): void {
  mainWindowRef = window
}
```

**Step 3: Add fireReminder function**

```typescript
async function fireReminder(task: ReminderTask): Promise<void> {
  // Remove from timers map
  timers.delete(task.id)

  // Show notification
  const notification = new Notification({
    title: task.title,
    body: 'Reminder',
    silent: false,
  })

  notification.on('click', () => {
    if (mainWindowRef) {
      mainWindowRef.focus()
      mainWindowRef.webContents.send('reminder:clicked', { taskId: task.id })
    }
  })

  notification.show()

  // Clear reminder from file
  const updatedMeta: TaskMeta = { ...task.meta, reminder: undefined }
  const updatedTask: VaultItem = { ...task, meta: updatedMeta }
  await fileService.forceWriteFile(task.path, updatedTask)
}
```

**Step 4: Add scheduleReminder function**

```typescript
export function scheduleReminder(task: ReminderTask): void {
  // Cancel existing timer if any
  const existing = timers.get(task.id)
  if (existing) {
    clearTimeout(existing)
    timers.delete(task.id)
  }

  const reminderTime = task.meta.reminder
  if (!reminderTime) return

  const now = Date.now()
  const reminderMs = new Date(reminderTime).getTime()
  const delay = reminderMs - now

  if (delay <= 0) {
    // Fire immediately for past reminders
    fireReminder(task)
  } else {
    // Schedule future reminder
    const timer = setTimeout(() => fireReminder(task), delay)
    timers.set(task.id, timer)
  }
}
```

**Step 5: Add cancelReminder function**

```typescript
export function cancelReminder(taskId: string): void {
  const timer = timers.get(taskId)
  if (timer) {
    clearTimeout(timer)
    timers.delete(taskId)
  }
}
```

**Step 6: Add initialize function**

```typescript
export function initialize(tasks: VaultItem[]): void {
  // Clear all existing timers
  for (const timer of timers.values()) {
    clearTimeout(timer)
  }
  timers.clear()

  // Schedule reminders for all tasks with reminders set
  for (const item of tasks) {
    if (item.meta.type === 'task' && item.meta.reminder) {
      scheduleReminder(item as ReminderTask)
    }
  }
}
```

**Step 7: Add handleFileChange function**

```typescript
export function handleFileChange(item: VaultItem): void {
  if (item.meta.type !== 'task') return

  const task = item as ReminderTask
  if (task.meta.reminder) {
    scheduleReminder(task)
  } else {
    cancelReminder(task.id)
  }
}
```

**Step 8: Add handleFileDelete function**

```typescript
export function handleFileDelete(itemId: string): void {
  cancelReminder(itemId)
}
```

**Step 9: Commit**

```bash
git add src/main/services/reminder-service.ts
git commit -m "feat(reminders): add ReminderService for scheduling notifications"
```

---

## Task 2: Wire ReminderService into IPC handlers

**Files:**
- Modify: `src/main/ipc.ts`

**Step 1: Import reminder service**

Add import at top of file after other imports:

```typescript
import * as reminderService from './services/reminder-service'
```

**Step 2: Initialize reminder service in registerIpcHandlers**

Add at start of `registerIpcHandlers` function, right after `mainWindowRef = mainWindow`:

```typescript
reminderService.setMainWindow(mainWindow)
```

**Step 3: Add reminder initialization to vault:init handler**

In the `vault:init` handler, after `const items = await fileService.loadVault(folderPath)` and before `return items`:

```typescript
reminderService.initialize(items)
```

**Step 4: Add reminder initialization to vault:load handler**

In the `vault:load` handler, after `const items = await fileService.loadVault(folderPath)` and before `return items`:

```typescript
reminderService.initialize(items)
```

**Step 5: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat(reminders): wire ReminderService into vault loading"
```

---

## Task 3: Handle file change events for reminders

**Files:**
- Modify: `src/main/services/file-service.ts`

**Step 1: Import reminder service**

Add import at top of file after other imports:

```typescript
import * as reminderService from './reminder-service'
```

**Step 2: Add reminder handling in watcher 'change' event**

In the `watcher.on('change', ...)` callback, after `mainWindow.webContents.send('file:changed', item)`:

```typescript
reminderService.handleFileChange(item)
```

**Step 3: Add reminder handling in watcher 'add' event**

In the `watcher.on('add', ...)` callback, after `mainWindow.webContents.send('file:added', item)`:

```typescript
reminderService.handleFileChange(item)
```

**Step 4: Add reminder cancellation in watcher 'unlink' event**

In the `watcher.on('unlink', ...)` callback, after `mainWindow.webContents.send('file:deleted', filePath)`:

```typescript
// Extract task ID from path for reminder cancellation
const filename = path.basename(filePath, '.md')
const idMatch = filename.match(/^([a-z0-9]{4})-/)
if (idMatch) {
  reminderService.handleFileDelete(idMatch[1])
}
```

Note: This needs `path` import which is already at top of file.

**Step 5: Commit**

```bash
git add src/main/services/file-service.ts
git commit -m "feat(reminders): handle file changes for reminder scheduling"
```

---

## Task 4: Expose reminder:clicked event to renderer

**Files:**
- Modify: `src/preload/index.ts`

**Step 1: Add onReminderClicked to api object**

Add after `onFileDeleted`:

```typescript
onReminderClicked: (callback: (data: { taskId: string }) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, data: { taskId: string }) => callback(data)
  ipcRenderer.on('reminder:clicked', listener)
  return () => ipcRenderer.removeListener('reminder:clicked', listener)
},
```

**Step 2: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat(reminders): expose reminder:clicked IPC event to renderer"
```

---

## Task 5: Handle reminder click in renderer

**Files:**
- Modify: `src/renderer/App.tsx` (or wherever the VaultProvider and UIProvider are composed)

First, let me check where the providers are composed to determine the right place to add the listener.

**Step 1: Find the right location**

Read `src/renderer/App.tsx` to find where VaultProvider and UIProvider are used together.

**Step 2: Add listener hook**

Create a component or hook that listens for `reminder:clicked` and calls `setSelectedTaskId`. The exact implementation depends on where providers are composed.

If UIProvider is inside VaultProvider, create a new component `ReminderHandler` that:
- Uses `useUI()` to get `setSelectedTaskId`
- Uses `useVault()` to get `items` (to find task and navigate to its view)
- Sets up effect to listen for `reminder:clicked`
- On click: finds the task, determines its view (project path or inbox), sets view, then sets task ID

```typescript
function ReminderHandler() {
  const { setSelectedView, setSelectedTaskId } = useUI()
  const { items, vaultPath } = useVault()

  useEffect(() => {
    const unsubscribe = window.api.onReminderClicked(({ taskId }) => {
      const task = items.get(taskId)
      if (!task) return

      // Determine which view to show
      const taskDir = path.dirname(task.path)
      const inboxPath = vaultPath ? path.join(vaultPath, 'Inbox') : null

      if (inboxPath && taskDir === inboxPath) {
        setSelectedView('inbox')
      } else {
        setSelectedView('project', taskDir)
      }

      // Select the task after a tick to ensure view is set
      setTimeout(() => setSelectedTaskId(taskId), 0)
    })

    return unsubscribe
  }, [items, vaultPath, setSelectedView, setSelectedTaskId])

  return null
}
```

**Step 3: Add ReminderHandler inside the provider tree**

Place `<ReminderHandler />` inside both VaultProvider and UIProvider.

**Step 4: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat(reminders): navigate to task when reminder notification clicked"
```

---

## Task 6: Add window.api type for onReminderClicked

**Files:**
- Modify: `src/renderer/vite-env.d.ts` or wherever Window interface is extended

**Step 1: Find the Window type declaration**

Search for where `window.api` types are declared.

**Step 2: Add onReminderClicked type**

Add to the api interface:

```typescript
onReminderClicked: (callback: (data: { taskId: string }) => void) => () => void
```

**Step 3: Commit**

```bash
git add <file>
git commit -m "feat(reminders): add TypeScript types for onReminderClicked"
```

---

## Task 7: Manual testing

**Steps:**
1. Start the app in development mode
2. Create a task with a reminder set to 1 minute from now
3. Wait for notification to appear
4. Verify notification shows task title
5. Click notification, verify app focuses and task is selected
6. Verify reminder field is cleared from task
7. Close app, create task with past reminder time (edit file directly)
8. Start app, verify notification fires immediately on startup
9. Test deleting a task with pending reminder - no crash/error

**Step 8: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(reminders): address issues found in testing"
```
