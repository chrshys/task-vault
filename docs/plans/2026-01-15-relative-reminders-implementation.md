# Relative Reminders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-select relative reminder UI to DueDatePicker with backend scheduling support.

**Architecture:** Store reminder offsets (minutes before due time) in task metadata. UI toggle chips in DueDatePicker. Reminder service calculates absolute times from due date + offsets.

**Tech Stack:** React, TypeScript, Electron notifications, date-fns

---

## Task 1: Update Data Model

**Files:**
- Modify: `src/shared/types.ts:36-46`

**Step 1: Add reminders field to TaskMeta**

In `src/shared/types.ts`, update `TaskMeta` interface to add `reminders` field:

```typescript
export interface TaskMeta extends BaseMeta {
  type: 'task'
  status: TaskStatus
  due?: string
  reminder?: string // deprecated, keep for backwards compat
  reminders?: number[] // NEW: array of offsets in minutes (0 = at due time)
  repeat?: RepeatConfig | null
  parent?: string | null
  completed_at?: string
  previous_instance?: string
  sort_order?: number
}
```

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: PASS (no breaking changes)

**Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add reminders array to TaskMeta"
```

---

## Task 2: Add Reminder Constants

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: Add reminder offset constants**

Add after the `DayOfWeek` type definition (around line 11):

```typescript
export const REMINDER_OFFSETS = [
  { value: 0, label: 'At time' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 180, label: '3 hours' },
  { value: 1440, label: '1 day' },
] as const

export type ReminderOffset = typeof REMINDER_OFFSETS[number]['value']
```

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add REMINDER_OFFSETS constant"
```

---

## Task 3: Update DueDatePicker Props

**Files:**
- Modify: `src/renderer/components/ui/DueDatePicker.tsx:1-23`

**Step 1: Update imports and props interface**

Replace the imports and props interface at the top of the file:

```typescript
import { useState, useRef, useEffect } from 'react'
import type { RepeatConfig, RepeatFrequency, RepeatFrom } from '@shared/types'
import { REMINDER_OFFSETS } from '@shared/types'

interface DueDatePickerProps {
  dueDate: Date | null
  repeat: RepeatConfig | null
  reminders: number[] // NEW
  onDateChange: (date: Date | null) => void
  onRepeatChange: (repeat: RepeatConfig | null) => void
  onRemindersChange: (reminders: number[]) => void // NEW
}
```

**Step 2: Update function signature**

Update the destructuring to include new props:

```typescript
export function DueDatePicker({
  dueDate,
  repeat,
  reminders,
  onDateChange,
  onRepeatChange,
  onRemindersChange,
}: DueDatePickerProps) {
```

**Step 3: Run type check (expect errors)**

Run: `npm run typecheck`
Expected: FAIL - TaskDetail.tsx missing new props (this is expected)

**Step 4: Commit**

```bash
git add src/renderer/components/ui/DueDatePicker.tsx
git commit -m "feat(DueDatePicker): add reminders props"
```

---

## Task 4: Add Reminder Chips UI

**Files:**
- Modify: `src/renderer/components/ui/DueDatePicker.tsx`

**Step 1: Add expanded state for reminders section**

Find the line with `const [repeatExpanded, setRepeatExpanded] = useState(false)` and add after it:

```typescript
  const [reminderExpanded, setReminderExpanded] = useState(false)
```

**Step 2: Add reminder toggle handler**

Add this handler function after `handleClearTime`:

```typescript
  const handleReminderToggle = (offset: number) => {
    if (reminders.includes(offset)) {
      onRemindersChange(reminders.filter(r => r !== offset))
    } else {
      onRemindersChange([...reminders, offset].sort((a, b) => a - b))
    }
  }

  const handleClearReminders = () => {
    onRemindersChange([])
  }
```

**Step 3: Add reminder section UI**

Find the `{/* Repeat section */}` comment. Add this BEFORE it (after the Time section closing `</div>`):

```typescript
          {/* Reminder section - only show when time is set */}
          {hasTime && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setReminderExpanded(!reminderExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Remind me</span>
                  {reminders.length > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {reminders.length} set
                    </span>
                  )}
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${reminderExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {reminderExpanded && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_OFFSETS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleReminderToggle(value)}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                          reminders.includes(value)
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {reminders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearReminders}
                      className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
```

**Step 4: Run type check (expect errors)**

Run: `npm run typecheck`
Expected: FAIL - TaskDetail.tsx still missing props (expected)

**Step 5: Commit**

```bash
git add src/renderer/components/ui/DueDatePicker.tsx
git commit -m "feat(DueDatePicker): add reminder toggle chips UI"
```

---

## Task 5: Update TaskDetail to Pass Reminders Props

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1: Add reminders handler**

Find `handleRepeatChange` function and add after it:

```typescript
  const handleRemindersChange = (reminders: number[]) => {
    if (!localItem || localItem.meta.type !== 'task') return
    setLocalItem({
      ...localItem,
      meta: { ...localItem.meta, reminders } as TaskMeta,
    })
  }
```

**Step 2: Update DueDatePicker usage**

Find the `<DueDatePicker` component usage (around line 176). Replace with:

```typescript
            <DueDatePicker
              dueDate={due ? new Date(due) : null}
              repeat={repeat ?? null}
              reminders={taskMeta?.reminders ?? []}
              onDateChange={(date) => handleDueChange(date?.toISOString() || '')}
              onRepeatChange={handleRepeatChange}
              onRemindersChange={handleRemindersChange}
            />
```

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/renderer/components/layout/TaskDetail.tsx
git commit -m "feat(TaskDetail): wire up reminders to DueDatePicker"
```

---

## Task 6: Update Reminder Service Data Structure

**Files:**
- Modify: `src/main/services/reminder-service.ts`

**Step 1: Update timer storage type**

Find line 10: `const timers = new Map<string, NodeJS.Timeout>()`

Replace with:

```typescript
const timers = new Map<string, NodeJS.Timeout[]>()
```

**Step 2: Update cancelReminder function**

Replace the `cancelReminder` function:

```typescript
export function cancelReminder(taskId: string): void {
  const taskTimers = timers.get(taskId)
  if (taskTimers) {
    taskTimers.forEach(timer => clearTimeout(timer))
    timers.delete(taskId)
  }
}
```

**Step 3: Run type check (expect errors)**

Run: `npm run typecheck`
Expected: FAIL - scheduleReminder and initialize need updates

**Step 4: Commit**

```bash
git add src/main/services/reminder-service.ts
git commit -m "refactor(reminder-service): change timers to store arrays"
```

---

## Task 7: Update Reminder Scheduling Logic

**Files:**
- Modify: `src/main/services/reminder-service.ts`

**Step 1: Create helper to fire a single reminder**

Add after `setMainWindow` function:

```typescript
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
```

**Step 2: Replace scheduleReminder function**

Replace the entire `scheduleReminder` function:

```typescript
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
```

**Step 3: Remove old fireReminder function**

Delete the entire `fireReminder` function (the async one that writes to file).

**Step 4: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/reminder-service.ts
git commit -m "feat(reminder-service): support multiple reminders per task"
```

---

## Task 8: Update Initialize and HandleFileChange

**Files:**
- Modify: `src/main/services/reminder-service.ts`

**Step 1: Update initialize function**

Replace the `initialize` function:

```typescript
export function initialize(tasks: VaultItem[]): void {
  checkNotificationPermissions()

  // Clear all existing timers
  for (const taskTimers of timers.values()) {
    taskTimers.forEach(timer => clearTimeout(timer))
  }
  timers.clear()

  // Schedule reminders for all tasks with reminders array set
  let scheduledCount = 0
  for (const item of tasks) {
    if (item.meta.type === 'task') {
      const task = item as ReminderTask
      if (task.meta.reminders && task.meta.reminders.length > 0 && task.meta.due) {
        scheduleReminder(task)
        scheduledCount++
      }
    }
  }
  console.log(`[Reminders] Initialized. Scheduled reminders for ${scheduledCount} task(s)`)
}
```

**Step 2: Update handleFileChange function**

Replace the `handleFileChange` function:

```typescript
export function handleFileChange(item: VaultItem): void {
  if (item.meta.type !== 'task') return

  const task = item as ReminderTask
  if (task.meta.reminders && task.meta.reminders.length > 0 && task.meta.due) {
    scheduleReminder(task)
  } else {
    cancelReminder(task.id)
  }
}
```

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/main/services/reminder-service.ts
git commit -m "feat(reminder-service): update initialize and handleFileChange for new model"
```

---

## Task 9: Add Bell Indicator to TaskRow

**Files:**
- Modify: `src/renderer/components/task/TaskRow.tsx`

**Step 1: Extract reminders from task meta**

Find line 43 where `due` is extracted. Add after it:

```typescript
  const reminders = taskMeta?.reminders
  const hasReminders = reminders && reminders.length > 0
```

**Step 2: Import REMINDER_OFFSETS**

Update the imports at the top of the file to add:

```typescript
import { REMINDER_OFFSETS } from '@shared/types'
```

**Step 3: Add helper to format reminder tooltip**

Add after the `getFirstLine` function:

```typescript
function formatRemindersTooltip(reminders: number[]): string {
  return reminders
    .map(offset => REMINDER_OFFSETS.find(r => r.value === offset)?.label ?? `${offset}min`)
    .join(', ')
}
```

**Step 4: Add bell icon next to due date**

Find the due date display (around line 130-134). Replace:

```typescript
      {due && !isCompleted && (
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {hasReminders && (
            <span
              className="text-gray-400 dark:text-gray-500"
              title={`Reminders: ${formatRemindersTooltip(reminders)}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
          )}
          <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
            {formatDueDate(due)}
          </span>
        </div>
      )}
```

**Step 5: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/renderer/components/task/TaskRow.tsx
git commit -m "feat(TaskRow): add bell indicator for tasks with reminders"
```

---

## Task 10: Clear Reminders When Due Time Removed

**Files:**
- Modify: `src/renderer/components/ui/DueDatePicker.tsx`

**Step 1: Update handleClearTime to also clear reminders**

Find `handleClearTime` function and replace:

```typescript
  const handleClearTime = () => {
    if (dueDate) {
      setDateWithTime(dueDate, null)
      // Clear reminders when time is removed (reminders require a time)
      if (reminders.length > 0) {
        onRemindersChange([])
      }
    }
  }
```

**Step 2: Update handleClear to also clear reminders**

Find `handleClear` function and replace:

```typescript
  const handleClear = () => {
    onDateChange(null)
    onRepeatChange(null)
    onRemindersChange([])
    setIsOpen(false)
  }
```

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/renderer/components/ui/DueDatePicker.tsx
git commit -m "fix(DueDatePicker): clear reminders when due time is removed"
```

---

## Task 11: Auto-Select Default Reminder

**Files:**
- Modify: `src/renderer/components/ui/DueDatePicker.tsx`

**Step 1: Add effect to auto-select default reminder when time is first set**

Find the state declarations (around line 24-30). Add a ref to track if time was just added:

```typescript
  const prevHasTime = useRef(hasTime)
```

**Step 2: Add effect after the state sync effect**

Add after the `if (dueDate !== prevDueDate)` block:

```typescript
  // Auto-select "At time" reminder when time is first set
  useEffect(() => {
    if (hasTime && !prevHasTime.current && reminders.length === 0) {
      onRemindersChange([0]) // Default to "At time"
    }
    prevHasTime.current = hasTime
  }, [hasTime, reminders.length, onRemindersChange])
```

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Test manually**

1. Open app
2. Select a task without due date
3. Set a due date with time
4. Verify "At time" chip is auto-selected
5. Remove time, verify reminders cleared

**Step 5: Commit**

```bash
git add src/renderer/components/ui/DueDatePicker.tsx
git commit -m "feat(DueDatePicker): auto-select 'At time' when due time first set"
```

---

## Task 12: Final Build and Test

**Step 1: Run full type check**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Run tests if any**

Run: `npm test`
Expected: PASS (or skip if no tests)

**Step 4: Manual E2E test**

1. Launch app: `npm run dev`
2. Create new task
3. Set due date with time (e.g., 2 min from now)
4. Verify "At time" reminder auto-selected
5. Select additional reminders (30 min, 1 hour)
6. Verify bell icon appears in task list
7. Hover bell to see tooltip
8. Wait for reminder to fire
9. Verify notification appears
10. Change due time, verify reminders reschedule

**Step 5: Commit all changes**

If any uncommitted fixes:
```bash
git add -A
git commit -m "fix: address any issues found in testing"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Add reminders to TaskMeta | types.ts |
| 2 | Add REMINDER_OFFSETS constant | types.ts |
| 3 | Update DueDatePicker props | DueDatePicker.tsx |
| 4 | Add reminder chips UI | DueDatePicker.tsx |
| 5 | Wire up TaskDetail | TaskDetail.tsx |
| 6 | Update reminder service data structure | reminder-service.ts |
| 7 | Update scheduling logic | reminder-service.ts |
| 8 | Update initialize/handleFileChange | reminder-service.ts |
| 9 | Add bell indicator to TaskRow | TaskRow.tsx |
| 10 | Clear reminders when time removed | DueDatePicker.tsx |
| 11 | Auto-select default reminder | DueDatePicker.tsx |
| 12 | Build and test | - |
