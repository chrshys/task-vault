# TaskVault Design Document

A TickTick-style task manager with local markdown storage optimized for LLM consumption.

## Overview

TaskVault is a desktop task and note management app that presents a clean, familiar UI while storing all data as local markdown files. The backend is designed for LLM readability—users can point Claude Code, Claude Desktop, or any other LLM at their vault folder to read, edit, and manage their tasks programmatically.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Platform | Electron |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Editor | TipTap (WYSIWYG markdown) |
| File watching | Chokidar |
| Frontmatter parsing | gray-matter |
| Date handling | date-fns |
| ID generation | nanoid |

## Data Model

### Hierarchy

```
Folder
├── Folder (nested)
├── Project
│   ├── Task
│   └── Note
└── Task/Note (loose, not in a project)
```

- **Folders** contain other folders, projects, or loose tasks/notes
- **Projects** contain tasks and notes
- **Tasks** have due dates, times, reminders, repeat rules, and checkboxes
- **Notes** are identical to tasks but without due dates or completion checkboxes
- Tasks and notes can be converted to each other
- Subtasks are full tasks with a `parent` reference

### File Structure

```
~/Documents/MyVault/               (user-chosen location)
├── .vault.json                    (vault metadata)
├── Inbox/
│   ├── _folder.md
│   └── x7k2-quick-thought.md
├── Work/
│   ├── _folder.md
│   ├── Q1 Launch/
│   │   ├── _project.md
│   │   ├── a1b2-finalize-copy.md
│   │   ├── c3d4-review-designs.md
│   │   └── e5f6-send-invites.md      (subtask of a1b2)
│   └── m9n0-random-task.md           (loose task in folder)
└── Personal/
    ├── _folder.md
    └── Reading List/
        ├── _project.md
        └── p4q5-book-notes.md        (note, not task)
```

### File Naming

Files use a short ID + slug format: `a1b2-task-title.md`

- Short ID (4 chars) ensures uniqueness
- Slug provides human readability
- Renaming a task updates the slug but keeps the ID
- Parent/child links use the ID portion only

### File Formats

**Folder metadata (`_folder.md`)**
```markdown
---
type: folder
name: Work
icon: briefcase
color: blue
sort_order: 0
created: 2026-01-12T17:00:00Z
---
```

**Project metadata (`_project.md`)**
```markdown
---
type: project
name: Q1 Launch
icon: rocket
color: green
sort_order: 0
created: 2026-01-12T17:00:00Z
---

Optional project description or notes here.
```

**Task file**
```markdown
---
type: task
status: pending
due: 2026-01-15T09:00:00Z
reminder: 2026-01-15T08:30:00Z
repeat: null
parent: null
created: 2026-01-12T17:00:00Z
modified: 2026-01-12T17:00:00Z
---
# Finalize copy

Review the landing page copy with marketing team.

- [ ] Check headlines
- [ ] Verify CTAs
```

**Subtask file**
```markdown
---
type: task
status: pending
due: 2026-01-14T12:00:00Z
reminder: null
repeat: null
parent: a1b2-finalize-copy
created: 2026-01-12T17:00:00Z
modified: 2026-01-12T17:00:00Z
---
# Send invites

Email the stakeholder list.
```

**Note file**
```markdown
---
type: note
reminder: 2026-02-01T09:00:00Z
repeat: null
parent: null
created: 2026-01-12T17:00:00Z
modified: 2026-01-12T17:00:00Z
---
# Atomic Habits Notes

Key takeaways from the book...
```

**Repeat configuration (when applicable)**
```yaml
repeat:
  frequency: weekly      # daily, weekly, monthly, yearly
  interval: 1            # every 1 week
  from: due_date         # due_date or completion_date
  days: [mon, wed, fri]  # optional, for weekly
  day_of_month: 15       # optional, for monthly
```

### Task Status

- `pending` - not started
- `completed` - done (includes `completed_at` timestamp)

Completed tasks stay in place (not moved to archive). UI filters hide/show them.

## Architecture

### Process Model

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process (Electron)                                     │
│ ├── File system operations (read/write/watch)               │
│ ├── Chokidar watcher → emits change events                  │
│ ├── Tray/menu bar icon                                      │
│ ├── Notification scheduling                                 │
│ └── IPC bridge to renderer                                  │
└─────────────────────────────────────────────────────────────┘
                         ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│ Renderer Process (React)                                    │
│ ├── UI components (shadcn)                                  │
│ ├── TipTap editor                                           │
│ ├── State derived from file system events                   │
│ └── Requests file operations via IPC                        │
└─────────────────────────────────────────────────────────────┘
```

The renderer never touches the file system directly—all reads/writes go through the main process via IPC.

### Main Process Services

**FileService**
- `watchVault()` - chokidar watches all .md files
- `readFile(path)` - parse frontmatter + content
- `writeFile(path, data)` - serialize + write
- `createFile(type, folder)` - generate ID, create file
- `deleteFile(path)`
- `moveFile(from, to)`

**ReminderService**
- `scheduleReminder(task)` - setTimeout or interval-based
- `cancelReminder(taskId)`
- `showNotification(task)` - Electron Notification API

**RepeatService**
- `calculateNextDue(task)` - next occurrence based on repeat config
- `completeAndRepeat(task)` - mark complete, generate next instance

### Renderer State

**VaultContext (React Context)**
- `items: Map<id, Task | Note | Folder | Project>`
- `tree: nested structure for sidebar`
- Rebuilds on file-changed / file-added / file-deleted events

**UIContext**
- `selectedView: 'today' | 'next7' | 'inbox' | path`
- `selectedTaskId: string | null`
- `sidebarCollapsed: boolean`

### Data Flows

**User edits a task**
1. User types in TipTap editor
2. Debounced (300ms) onChange fires
3. Renderer calls `ipc.invoke('file:write', { path, frontmatter, content })`
4. Main process writes file to disk
5. Chokidar detects change, emits event
6. Main process sends 'file:changed' to renderer
7. VaultContext updates item in map
8. UI re-renders with new data

**External edit (LLM via Claude Code)**
1. Claude Code writes to task file
2. Chokidar detects change
3. Main process reads + parses file
4. Main process sends 'file:changed' with new data
5. VaultContext updates
6. UI shows updated task immediately

**Completing a repeating task**
1. User clicks checkbox on repeating task
2. Renderer calls `ipc.invoke('task:complete', { path })`
3. Main process:
   - Reads current task
   - Calculates next due date
   - Updates original: `status: completed`, `repeat: null`
   - Creates new file with next due date, same repeat config
   - Duplicates subtasks with new parent reference
4. Chokidar picks up changes
5. UI shows completed task + new pending task

## UI Design

### Layout (Three Panel)

```
┌────────────────────────────────────────────────────────────────┐
│  TaskVault                                        ─  □  ✕     │
├────────┬───────────────────────────────┬───────────────────────┤
│        │                               │                       │
│ TODAY  │  WorkOS                    ⋮  │  📅 Tomorrow, 1:30 PM │
│ ────── │───────────────────────────────│───────────────────────│
│ 📅 Today   │ + Add task                  │  a new task           │
│ 📆 Next 7  │                             │                       │
│ 📥 Inbox   │ □ a new task        1 Day ▸ │  Description          │
│        │   └─ a subtask              │                       │
│ LISTS  │                               │  □ a subtask          │
│ ────── │ □ Summary of tickets   Jan 12 │  ☑ completed subtask  │
│ ≡ WorkOS   │                             │                       │
│ ≡ Clips    │ □ Scott assigns task Jan 12 │                       │
│ ≡ Gibson   │                             │                       │
│        │                               │                       │
├────────┴───────────────────────────────┴───────────────────────┤
│  + New Folder                                                  │
└────────────────────────────────────────────────────────────────┘
```

### Key Interactions

- Click task row → opens detail panel
- Click checkbox → toggles completion
- Double-click task title → inline edit
- Drag tasks → reorder or move between projects/folders
- Right-click → context menu (delete, duplicate, convert, move)
- `Cmd+N` → new task in current context
- `Cmd+Shift+N` → new note in current context

### Views

- **Today**: tasks where `due` is today
- **Next 7 Days**: tasks where `due` is within 7 days
- **Inbox**: tasks/notes in the `Inbox/` folder
- **Folder/Project**: tasks/notes within that path

## Project Structure

```
task-vault/
├── package.json
├── electron-builder.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
│
├── src/
│   ├── main/                        (Electron main process)
│   │   ├── index.ts
│   │   ├── ipc.ts
│   │   ├── tray.ts
│   │   ├── services/
│   │   │   ├── file-service.ts
│   │   │   ├── reminder-service.ts
│   │   │   └── repeat-service.ts
│   │   └── utils/
│   │       ├── id.ts
│   │       ├── slug.ts
│   │       └── frontmatter.ts
│   │
│   ├── renderer/                    (React app)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── contexts/
│   │   │   ├── VaultContext.tsx
│   │   │   └── UIContext.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TaskList.tsx
│   │   │   │   └── TaskDetail.tsx
│   │   │   ├── task/
│   │   │   │   ├── TaskRow.tsx
│   │   │   │   ├── TaskCheckbox.tsx
│   │   │   │   └── SubtaskList.tsx
│   │   │   ├── editor/
│   │   │   │   └── TipTapEditor.tsx
│   │   │   ├── pickers/
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   ├── TimePicker.tsx
│   │   │   │   ├── ReminderPicker.tsx
│   │   │   │   └── RepeatPicker.tsx
│   │   │   └── ui/                  (shadcn components)
│   │   ├── hooks/
│   │   │   ├── useVault.ts
│   │   │   ├── useTask.ts
│   │   │   └── useIPC.ts
│   │   ├── lib/
│   │   │   ├── ipc.ts
│   │   │   └── dates.ts
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── shared/
│   │   └── types.ts
│   │
│   └── preload/
│       └── index.ts
│
└── resources/
    ├── icon.png
    └── tray-icon.png
```

## Configuration

**Vault config (`.vault.json` in vault root)**
```json
{
  "version": 1,
  "created": "2026-01-12T18:00:00Z"
}
```

**App settings (`~/Library/Application Support/TaskVault/settings.json`)**
```json
{
  "vaultPath": "/Users/chris/Documents/MyVault",
  "theme": "system",
  "showCompleted": true,
  "defaultReminder": 30,
  "startOnLogin": true,
  "showInMenuBar": true
}
```

## First Launch

1. App opens → detects no vault configured
2. Welcome screen: "Choose where to store your tasks and notes"
3. User picks or creates folder
4. App creates initial structure (Inbox folder)
5. Main window opens with empty Inbox selected

## V1 Scope

### Included

- Folder / Project / Task / Note hierarchy
- Create, edit, delete, move items
- YAML frontmatter + markdown body storage
- WYSIWYG editor (TipTap)
- Due dates, times, reminders
- Repeating tasks
- Subtasks as separate files
- Today / Next 7 Days / Inbox views
- File system watching (external edits sync instantly)
- Menu bar presence + system notifications
- Light/dark theme
- Drag to reorder and move items
- Task ↔ Note conversion
- Keyboard shortcuts

### Excluded (Future)

- Search
- Tags/labels
- Custom filters and smart views
- Calendar view
- Pomodoro timer
- Attachments/images
- Multi-vault support
- Cloud sync (use Dropbox/iCloud manually)
- Mobile apps
- Import from TickTick/Todoist
- In-app LLM integration
