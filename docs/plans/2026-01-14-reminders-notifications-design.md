# Reminders v1 - Notifications Design

## Overview

Basic reminder notifications for TaskVault. When a task's reminder time arrives, show a system notification. Clicking the notification focuses the app and selects the task.

## Scope

**In scope:**
- System notifications when reminder time hits
- Click notification to focus app + select task
- Auto-clear reminder after firing
- Show missed reminders on app startup

**Out of scope (future):**
- Reminder management UI
- Snooze functionality
- Recurring reminders
- Sound/custom notification options

## Architecture

```
Main Process                         Renderer Process
┌─────────────────────┐              ┌─────────────────────┐
│ ReminderService     │              │ VaultContext        │
│ - scheduledTimers   │◄── IPC ─────►│ - updateItem()      │
│ - scheduleReminder()│              │ - on reminder click │
│ - cancelReminder()  │              └─────────────────────┘
│ - checkMissed()     │
└─────────────────────┘
         │
         ▼
   Electron Notification API
```

### Data Flow

1. On vault load, main process scans all tasks with reminders
2. Past reminders fire immediately, then clear
3. Future reminders get scheduled as in-memory timers
4. When timer fires: show notification, clear reminder from file, notify renderer
5. On notification click: focus window, send IPC to select task

### File Changes on Reminder Fire

Main process writes updated task file with `reminder: null`. Chokidar picks up change, renderer updates automatically via existing flow.

## ReminderService Implementation

### State

```typescript
class ReminderService {
  private timers: Map<string, NodeJS.Timeout> = new Map()  // taskId → timer
  private vaultPath: string | null = null
}
```

### Methods

**`initialize(vaultPath, tasks)`**
- Called when vault loads
- Store vault path for file operations
- Clear any existing timers
- For each task with reminder: call `scheduleReminder()`

**`scheduleReminder(task)`**
- If reminder time is in the past: fire immediately
- If reminder time is in the future: set timeout, store in timers map

**`fireReminder(task)`**
- Show Electron Notification with task title
- On notification click: `mainWindow.focus()` + send `reminder:clicked` IPC with task ID
- Clear reminder from file (write `reminder: null`)
- Remove from timers map

**`cancelReminder(taskId)`**
- Clear timeout if exists
- Remove from timers map

**`handleFileChange(task)`**
- If reminder added/changed: reschedule
- If reminder removed: cancel existing timer

## IPC Events

```typescript
// Main → Renderer
'reminder:clicked'    // { taskId: string } - user clicked notification
'reminder:cleared'    // { taskId: string } - reminder auto-cleared after firing
```

No new Renderer → Main IPC needed. Reminder changes flow through existing `writeFile()`.

## Startup Behavior

1. App launches, vault opens
2. `reminderService.initialize()` scans all tasks
3. For each task with reminder set:
   - If past: fire notification immediately, clear from file
   - If future: schedule timer
4. Multiple missed reminders fire as multiple notifications

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Task deleted while reminder pending | `cancelReminder()` via file delete event |
| Task edited externally (LLM adds reminder) | `handleFileChange()` schedules it |
| Reminder time changed | Cancel old timer, schedule new |
| Reminder cleared manually | `handleFileChange()` cancels timer |
| App quit with pending reminders | Fire as "missed" on next launch |
| Task completed with reminder set | Reminder still fires (no special handling) |

## Files to Modify

1. `src/main/services/reminder-service.ts` - Core service implementation
2. `src/main/ipc.ts` - Wire up initialization and file change handling
3. `src/renderer/contexts/VaultContext.tsx` - Listen for `reminder:clicked`
4. `src/preload/index.ts` - Expose new IPC event if needed
