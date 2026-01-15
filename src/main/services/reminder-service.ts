import { Notification, BrowserWindow } from 'electron'
import type { VaultItem, TaskMeta } from '../../shared/types'

console.log('[Reminders] Module loaded')

type ReminderTask = VaultItem & { meta: TaskMeta }

let mainWindowRef: BrowserWindow | null = null
const timers = new Map<string, NodeJS.Timeout[]>()

function checkNotificationPermissions(): void {
  console.log('[Reminders] Notification.isSupported():', Notification.isSupported())
  if (process.platform === 'darwin') {
    console.log('[Reminders] macOS detected. If notifications do not appear, check System Settings → Notifications → TaskVault')
  }
}

export function setMainWindow(window: BrowserWindow): void {
  mainWindowRef = window
}

async function fireSingleReminder(task: ReminderTask, offsetMinutes: number): Promise<void> {
  console.log(`[Reminders] Firing reminder for task: ${task.title} (${task.id}), offset: ${offsetMinutes}min`)

  if (!Notification.isSupported()) {
    console.error('[Reminders] Notifications not supported on this system')
    return
  }

  const offsetLabel = offsetMinutes === 0 ? 'now' :
    offsetMinutes < 60 ? `in ${offsetMinutes} min` :
    offsetMinutes < 1440 ? `in ${offsetMinutes / 60} hour${offsetMinutes > 60 ? 's' : ''}` :
    'in 1 day'

  const notification = new Notification({
    title: task.title,
    body: offsetMinutes === 0 ? 'Due now' : `Due ${offsetLabel}`,
    silent: false,
  })

  notification.on('click', () => {
    console.log(`[Reminders] Notification clicked for task: ${task.id}`)
    if (mainWindowRef) {
      mainWindowRef.focus()
      mainWindowRef.webContents.send('reminder:clicked', { taskId: task.id })
    }
  })

  notification.show()
}

export function scheduleReminder(task: ReminderTask): void {
  console.log(`[Reminders] scheduleReminder called for: ${task.title} (${task.id})`)

  // Cancel existing timers
  cancelReminder(task.id)

  const { due, reminders } = task.meta

  // Need both due date with time and reminders array
  if (!due || !reminders || reminders.length === 0) {
    console.log(`[Reminders]   no due date or reminders, skipping`)
    return
  }

  const dueDate = new Date(due)
  // Skip if due date has no time component (midnight = no time set)
  if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
    console.log(`[Reminders]   due date has no time, skipping`)
    return
  }

  const now = Date.now()
  const dueMs = dueDate.getTime()
  const taskTimers: NodeJS.Timeout[] = []

  for (const offsetMinutes of reminders) {
    const reminderMs = dueMs - (offsetMinutes * 60 * 1000)
    const delay = reminderMs - now

    console.log(`[Reminders]   offset ${offsetMinutes}min: delay ${delay}ms (${Math.round(delay / 1000)}s)`)

    if (delay <= 0) {
      // Skip past reminders
      console.log(`[Reminders]     skipping (in past)`)
      continue
    }

    const timer = setTimeout(() => {
      fireSingleReminder(task, offsetMinutes)
      // Remove this timer from the array
      const currentTimers = timers.get(task.id)
      if (currentTimers) {
        const index = currentTimers.indexOf(timer)
        if (index > -1) {
          currentTimers.splice(index, 1)
        }
        if (currentTimers.length === 0) {
          timers.delete(task.id)
        }
      }
    }, delay)

    taskTimers.push(timer)
  }

  if (taskTimers.length > 0) {
    timers.set(task.id, taskTimers)
    console.log(`[Reminders]   scheduled ${taskTimers.length} reminder(s)`)
  }
}

export function cancelReminder(taskId: string): void {
  const taskTimers = timers.get(taskId)
  if (taskTimers) {
    taskTimers.forEach(timer => clearTimeout(timer))
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
