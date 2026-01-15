import { Notification, BrowserWindow } from 'electron'
import type { VaultItem, TaskMeta } from '../../shared/types'
import * as fileService from './file-service'

type ReminderTask = VaultItem & { meta: TaskMeta }

let mainWindowRef: BrowserWindow | null = null
const timers = new Map<string, NodeJS.Timeout>()

export function setMainWindow(window: BrowserWindow): void {
  mainWindowRef = window
}

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

export function cancelReminder(taskId: string): void {
  const timer = timers.get(taskId)
  if (timer) {
    clearTimeout(timer)
    timers.delete(taskId)
  }
}

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
