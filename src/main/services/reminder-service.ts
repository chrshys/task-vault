import { Notification, BrowserWindow } from 'electron'
import type { VaultItem, TaskMeta } from '../../shared/types'
import * as fileService from './file-service'

console.log('[Reminders] Module loaded')

type ReminderTask = VaultItem & { meta: TaskMeta }

let mainWindowRef: BrowserWindow | null = null
const timers = new Map<string, NodeJS.Timeout>()

function checkNotificationPermissions(): void {
  console.log('[Reminders] Notification.isSupported():', Notification.isSupported())
  if (process.platform === 'darwin') {
    console.log('[Reminders] macOS detected. If notifications do not appear, check System Settings → Notifications → TaskVault')
  }
}

export function setMainWindow(window: BrowserWindow): void {
  mainWindowRef = window
}

async function fireReminder(task: ReminderTask): Promise<void> {
  console.log(`[Reminders] Firing reminder for task: ${task.title} (${task.id})`)

  // Remove from timers map
  timers.delete(task.id)

  if (!Notification.isSupported()) {
    console.error('[Reminders] Notifications not supported on this system')
    return
  }

  // Show notification
  const notification = new Notification({
    title: task.title,
    body: 'Reminder',
    silent: false,
  })

  notification.on('click', () => {
    console.log(`[Reminders] Notification clicked for task: ${task.id}`)
    if (mainWindowRef) {
      mainWindowRef.focus()
      mainWindowRef.webContents.send('reminder:clicked', { taskId: task.id })
    }
  })

  notification.on('show', () => {
    console.log(`[Reminders] Notification shown for task: ${task.id}`)
  })

  notification.on('failed', (_event, error) => {
    console.error(`[Reminders] Notification failed for task: ${task.id}`, error)
  })

  notification.show()

  // Clear reminder from file
  const updatedMeta: TaskMeta = { ...task.meta, reminder: undefined }
  const updatedTask: VaultItem = { ...task, meta: updatedMeta }
  await fileService.forceWriteFile(task.path, updatedTask)
}

export function scheduleReminder(task: ReminderTask): void {
  console.log(`[Reminders] scheduleReminder called for: ${task.title} (${task.id})`)
  console.log(`[Reminders]   reminder value: ${task.meta.reminder}`)

  // Cancel existing timer if any
  const existing = timers.get(task.id)
  if (existing) {
    clearTimeout(existing)
    timers.delete(task.id)
  }

  const reminderTime = task.meta.reminder
  if (!reminderTime) {
    console.log(`[Reminders]   no reminder time, skipping`)
    return
  }

  const now = Date.now()
  const reminderMs = new Date(reminderTime).getTime()
  const delay = reminderMs - now

  console.log(`[Reminders]   now: ${now}, reminderMs: ${reminderMs}, delay: ${delay}ms (${Math.round(delay / 1000)}s)`)

  if (delay <= 0) {
    // Fire immediately for past reminders
    console.log(`[Reminders]   firing immediately (past reminder)`)
    fireReminder(task)
  } else {
    // Schedule future reminder
    console.log(`[Reminders]   scheduling for ${delay}ms from now`)
    const timer = setTimeout(() => fireReminder(task), delay)
    timers.set(task.id, timer)
  }
}

export function cancelReminder(taskId: string): void {
  const timer = timers.get(taskId)
  if (timer) {
    clearTimeout(timer)
    timers.delete(taskId)
  }
}

export function initialize(tasks: VaultItem[]): void {
  checkNotificationPermissions()

  // Clear all existing timers
  for (const timer of timers.values()) {
    clearTimeout(timer)
  }
  timers.clear()

  // Schedule reminders for all tasks with reminders set
  let scheduledCount = 0
  for (const item of tasks) {
    if (item.meta.type === 'task' && item.meta.reminder) {
      scheduleReminder(item as ReminderTask)
      scheduledCount++
    }
  }
  console.log(`[Reminders] Initialized. Scheduled ${scheduledCount} reminder(s)`)
}

export function handleFileChange(item: VaultItem): void {
  if (item.meta.type !== 'task') return

  const task = item as ReminderTask
  if (task.meta.reminder) {
    scheduleReminder(task)
  } else {
    cancelReminder(task.id)
  }
}

export function handleFileDelete(itemId: string): void {
  cancelReminder(itemId)
}
