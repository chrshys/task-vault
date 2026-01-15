# Relative Reminders Design

## Overview

Add reminder functionality to tasks with relative offsets from the due time. Users can select multiple reminder times (e.g., "30 min before" and "1 day before") via toggle chips in the DueDatePicker.

## Research

Reviewed Todoist, Apple Reminders, and TickTick. Common patterns:
- Automatic reminders when due time is set
- Relative offsets ("X time before due")
- Multiple reminders per task (often premium feature)

## Design Decisions

- **Relative reminders** tied to due date (not absolute times)
- **Multi-select** toggle chips for reminder offsets
- **Default**: Reminder at due time when due time is set
- **UI location**: Inside DueDatePicker, below time picker

## Data Model

### Current
```typescript
reminder?: string  // Single ISO datetime (never exposed in UI)
```

### New
```typescript
reminders?: number[]  // Array of offsets in minutes before due time
```

### Offset Values
| Display | Value (minutes) |
|---------|-----------------|
| At time | 0 |
| 15 min before | 15 |
| 30 min before | 30 |
| 1 hour before | 60 |
| 3 hours before | 180 |
| 1 day before | 1440 |

### Benefits of Offsets
- Auto-adjust when due date changes
- No recalculation needed on edit
- Simple to display
- Default `[0]` when due time set with no explicit selection

## UI Design

### DueDatePicker Layout
```
┌─────────────────────────────────────┐
│  📅 Due Date                        │
│  [Calendar grid...]                 │
│                                     │
│  🕐 Time                            │
│  [Time picker row...]               │
│                                     │
│  🔔 Remind me            [Clear]    │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ At time │ │ 15 min  │ │ 30 min │ │
│  └─────────┘ └─────────┘ └────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ 1 hour  │ │ 3 hours │ │ 1 day  │ │
│  └─────────┘ └─────────┘ └────────┘ │
│                                     │
│  🔁 Repeat                          │
│  [Repeat config...]                 │
└─────────────────────────────────────┘
```

### Chip Styles
- **Unselected**: `bg-gray-100` (light) / `bg-gray-700` (dark), muted text
- **Selected**: `bg-blue-100 text-blue-700` (light) / `bg-blue-900 text-blue-200` (dark)

### Behavior
- Only visible when due time is set
- Click toggles chip selection on/off
- Multiple chips can be selected
- Clear button removes all selections
- Default: "At time" auto-selected when due time first set

### Reminder Indicator
- Bell icon next to due date in TaskRow/TaskDetail when reminders set
- Tooltip shows: "Reminders: 30 min before, 1 day before"

## Reminder Service Changes

### Data Structure
```typescript
// Current
private scheduledReminders: Map<string, NodeJS.Timeout>

// New
private scheduledReminders: Map<string, NodeJS.Timeout[]>
```

### Scheduling Logic
1. When task has `reminders: number[]` and due time:
   - Calculate absolute times: `dueTime - offset` for each offset
   - Schedule separate `setTimeout` for each
   - Store array of timeout IDs per task

2. On reminder fire:
   - Show notification with task title
   - Remove that specific timeout from array
   - Do NOT clear `reminders` field (stores offsets, not state)

3. On due date change:
   - Clear all existing timeouts for task
   - Recalculate and reschedule based on new due time + offsets

4. On app startup:
   - Load all tasks with `reminders` and due times
   - Skip past reminder times
   - Schedule future ones

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Due time removed | Clear reminders array, cancel scheduled notifications |
| Due time in past | Don't schedule reminders |
| Reminder time in past, due time in future | Skip that reminder, schedule others |
| Task completed | Cancel all pending reminders |
| Task uncompleted | Reschedule if due time still in future |
| Recurring task completes | Schedule reminders for next instance |

## Settings

- Keep existing `defaultReminder` setting
- When user sets due time on task with no reminders, auto-select chip matching `defaultReminder` (default: 0 = "At time")
- Future: settings UI to change default (out of scope)

## Migration

The existing `reminder` field (ISO string) was never exposed in UI. Can be:
- Deprecated and ignored
- Or migrated to `reminders: [0]` if has value

## Files to Modify

1. `src/shared/types.ts` - Add `reminders` to TaskMeta
2. `src/renderer/components/ui/DueDatePicker.tsx` - Add reminder chips section
3. `src/main/services/reminder-service.ts` - Handle multiple reminders per task
4. `src/renderer/components/TaskRow.tsx` - Add bell indicator
5. `src/renderer/components/TaskDetail.tsx` - Add bell indicator
