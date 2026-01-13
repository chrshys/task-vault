# TaskVault Deficiency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete TaskVault from MVP skeleton to fully functional task manager with all V1 features.

**Architecture:** Build on existing Electron/React/TypeScript foundation. Add Vitest for testing, TipTap for rich editing, and complete missing UI features.

**Tech Stack:** Vitest, @testing-library/react, TipTap, react-datepicker

---

## Ralph Loop Instructions

### Progress Tracking

On each iteration:
1. Read `.claude/taskvault-v2-progress.yaml` (create if missing)
2. Resume from `current_phase` and `current_task`
3. Execute that task
4. Run verification command
5. If verification fails → debug, fix, re-verify (do NOT advance)
6. If verification passes → update progress file, commit, continue

### State File Format

```yaml
current_phase: 1
current_task: 1
completed_phases: []
notes: ""
```

### Final Completion

When all phases pass verification, output:
```
<promise>DEFICIENCIES COMPLETE</promise>
```

---

## Phase 1: Test Infrastructure

**Goal:** Set up Vitest with React Testing Library for unit and component tests.

### Task 1.1: Install test dependencies

**Files:** `package.json`

**Step 1:** Run install command
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

**Verification:**
```bash
cat package.json | grep vitest && echo "PASS: vitest installed"
```

**Commit:** `chore: add test dependencies`

---

### Task 1.2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Step 1:** Create vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
})
```

**Step 2:** Add test scripts to package.json
Add to "scripts":
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Verification:**
```bash
test -f vitest.config.ts && echo "PASS: vitest config exists"
```

**Commit:** `chore: configure vitest`

---

### Task 1.3: Create test setup file

**Files:**
- Create: `src/test/setup.ts`

**Step 1:** Create setup file
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron IPC
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

// Mock window.api for renderer tests
Object.defineProperty(window, 'api', {
  value: {
    loadVault: vi.fn(),
    initializeVault: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    createFile: vi.fn(),
    deleteFile: vi.fn(),
    moveFile: vi.fn(),
    selectFolder: vi.fn(),
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    onFileChange: vi.fn(() => vi.fn()),
  },
  writable: true,
})
```

**Verification:**
```bash
test -f src/test/setup.ts && echo "PASS: test setup exists"
```

**Commit:** `chore: add test setup with mocks`

---

### Task 1.4: Write first utility test

**Files:**
- Create: `src/main/utils/slug.test.ts`

**Step 1:** Create test file
```typescript
import { describe, it, expect } from 'vitest'
import { generateSlug } from './slug'

describe('generateSlug', () => {
  it('converts title to lowercase slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(generateSlug('Test: A Thing!')).toBe('test-a-thing')
  })

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('untitled')
  })

  it('trims and collapses whitespace', () => {
    expect(generateSlug('  Too   Many   Spaces  ')).toBe('too-many-spaces')
  })

  it('truncates long slugs', () => {
    const longTitle = 'a'.repeat(100)
    expect(generateSlug(longTitle).length).toBeLessThanOrEqual(50)
  })
})
```

**Verification:**
```bash
npm run test -- src/main/utils/slug.test.ts && echo "PASS: slug tests pass"
```

**Commit:** `test: add slug utility tests`

---

### Task 1.5: Write ID generator test

**Files:**
- Create: `src/main/utils/id.test.ts`

**Step 1:** Create test file
```typescript
import { describe, it, expect } from 'vitest'
import { generateId, isValidId } from './id'

describe('generateId', () => {
  it('generates 4-character alphanumeric ID', () => {
    const id = generateId()
    expect(id).toMatch(/^[a-z0-9]{4}$/)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('isValidId', () => {
  it('validates correct IDs', () => {
    expect(isValidId('a1b2')).toBe(true)
    expect(isValidId('0000')).toBe(true)
    expect(isValidId('zzzz')).toBe(true)
  })

  it('rejects invalid IDs', () => {
    expect(isValidId('ABC1')).toBe(false) // uppercase
    expect(isValidId('ab1')).toBe(false)  // too short
    expect(isValidId('ab123')).toBe(false) // too long
    expect(isValidId('ab-1')).toBe(false) // special char
  })
})
```

**Note:** If `isValidId` doesn't exist, add it to `src/main/utils/id.ts`:
```typescript
export function isValidId(id: string): boolean {
  return /^[a-z0-9]{4}$/.test(id)
}
```

**Verification:**
```bash
npm run test -- src/main/utils/id.test.ts && echo "PASS: id tests pass"
```

**Commit:** `test: add ID generator tests`

---

### Phase 1 Complete Verification

```bash
npm run test && echo "PHASE 1 COMPLETE"
```

Update progress: `current_phase: 2, current_task: 1`

---

## Phase 2: Core UI Polish

**Goal:** Add empty states, loading states, and error boundaries.

### Task 2.1: Create EmptyState component

**Files:**
- Create: `src/renderer/components/ui/EmptyState.tsx`

**Step 1:** Create component
```typescript
import React from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {icon && <span className="text-4xl mb-4">{icon}</span>}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/EmptyState.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add EmptyState component`

---

### Task 2.2: Create LoadingSpinner component

**Files:**
- Create: `src/renderer/components/ui/LoadingSpinner.tsx`

**Step 1:** Create component
```typescript
import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
      />
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/LoadingSpinner.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add LoadingSpinner component`

---

### Task 2.3: Create ErrorBoundary component

**Files:**
- Create: `src/renderer/components/ui/ErrorBoundary.tsx`

**Step 1:** Create component
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <span className="text-4xl mb-4">⚠️</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/ErrorBoundary.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add ErrorBoundary component`

---

### Task 2.4: Add empty states to TaskList

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1:** Import EmptyState
```typescript
import { EmptyState } from '../ui/EmptyState'
```

**Step 2:** Add empty state rendering after filtering tasks
When `tasks.length === 0`, render:
```typescript
if (tasks.length === 0) {
  const emptyStates = {
    today: {
      icon: '🎉',
      title: 'All done for today!',
      description: 'No tasks due today. Enjoy your day or add something new.',
    },
    next7: {
      icon: '📅',
      title: 'Week looks clear',
      description: 'No tasks due in the next 7 days.',
    },
    inbox: {
      icon: '📥',
      title: 'Inbox is empty',
      description: 'Items without a folder appear here.',
    },
    folder: {
      icon: '📁',
      title: 'No tasks yet',
      description: 'Create your first task in this folder.',
    },
  }

  const state = emptyStates[viewType] || emptyStates.folder
  return <EmptyState {...state} />
}
```

**Verification:**
```bash
npm run typecheck && echo "PASS"
```

**Commit:** `feat: add empty states to TaskList`

---

### Task 2.5: Add loading state to VaultContext

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1:** Add loading state to context
```typescript
interface VaultContextType {
  // ... existing fields
  isLoading: boolean
}
```

**Step 2:** Track loading during vault operations
```typescript
const [isLoading, setIsLoading] = useState(true)

const loadVault = async (path: string) => {
  setIsLoading(true)
  try {
    const result = await window.api.loadVault(path)
    // ... existing logic
  } finally {
    setIsLoading(false)
  }
}
```

**Verification:**
```bash
npm run typecheck && echo "PASS"
```

**Commit:** `feat: add loading state to VaultContext`

---

### Task 2.6: Test UI components

**Files:**
- Create: `src/renderer/components/ui/EmptyState.test.tsx`

**Step 1:** Create test
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Add some items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Add some items')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon="🎉" />)
    expect(screen.getByText('🎉')).toBeInTheDocument()
  })

  it('calls action onClick when button clicked', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Item', onClick }}
      />
    )
    fireEvent.click(screen.getByText('Add Item'))
    expect(onClick).toHaveBeenCalled()
  })
})
```

**Verification:**
```bash
npm run test -- src/renderer/components/ui/EmptyState.test.tsx && echo "PASS"
```

**Commit:** `test: add EmptyState component tests`

---

### Phase 2 Complete Verification

```bash
npm run test && npm run typecheck && echo "PHASE 2 COMPLETE"
```

Update progress: `current_phase: 3, current_task: 1`

---

## Phase 3: Date Picker Component

**Goal:** Replace native datetime-local with a proper date/time picker UI.

### Task 3.1: Install date picker

**Files:** `package.json`

**Step 1:** Install dependency
```bash
npm install react-datepicker @types/react-datepicker
```

**Verification:**
```bash
cat package.json | grep react-datepicker && echo "PASS"
```

**Commit:** `chore: add react-datepicker`

---

### Task 3.2: Create DateTimePicker component

**Files:**
- Create: `src/renderer/components/ui/DateTimePicker.tsx`

**Step 1:** Create component
```typescript
import React from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface DateTimePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  showTimeSelect?: boolean
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  showTimeSelect = true,
  className = '',
}: DateTimePickerProps) {
  return (
    <DatePicker
      selected={value}
      onChange={onChange}
      showTimeSelect={showTimeSelect}
      timeFormat="HH:mm"
      timeIntervals={15}
      dateFormat="MMM d, yyyy h:mm aa"
      placeholderText={placeholder}
      className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      calendarClassName="dark:bg-gray-800"
      isClearable
    />
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/DateTimePicker.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add DateTimePicker component`

---

### Task 3.3: Add datepicker styles

**Files:**
- Modify: `src/renderer/styles/globals.css`

**Step 1:** Add datepicker dark mode overrides (append to file)
```css
/* React Datepicker dark mode overrides */
.dark .react-datepicker {
  background-color: #1f2937;
  border-color: #374151;
}

.dark .react-datepicker__header {
  background-color: #374151;
  border-color: #4b5563;
}

.dark .react-datepicker__current-month,
.dark .react-datepicker__day-name,
.dark .react-datepicker__day {
  color: #f3f4f6;
}

.dark .react-datepicker__day:hover {
  background-color: #4b5563;
}

.dark .react-datepicker__day--selected {
  background-color: #2563eb;
}

.dark .react-datepicker__time-container {
  border-color: #374151;
}

.dark .react-datepicker__time {
  background-color: #1f2937;
}

.dark .react-datepicker__time-list-item {
  color: #f3f4f6;
}

.dark .react-datepicker__time-list-item:hover {
  background-color: #4b5563;
}
```

**Verification:**
```bash
grep "react-datepicker" src/renderer/styles/globals.css && echo "PASS"
```

**Commit:** `style: add datepicker dark mode styles`

---

### Task 3.4: Use DateTimePicker in TaskDetail

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1:** Replace datetime-local input with DateTimePicker
```typescript
import { DateTimePicker } from '../ui/DateTimePicker'

// In the due date section, replace:
// <input type="datetime-local" ... />

// With:
<DateTimePicker
  value={task.due ? new Date(task.due) : null}
  onChange={(date) => handleDueChange(date?.toISOString() || null)}
  placeholder="Add due date..."
/>
```

**Verification:**
```bash
grep "DateTimePicker" src/renderer/components/layout/TaskDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: use DateTimePicker in TaskDetail`

---

### Phase 3 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 3 COMPLETE"
```

Update progress: `current_phase: 4, current_task: 1`

---

## Phase 4: Notes Support

**Goal:** Full CRUD operations for notes, distinct from tasks.

### Task 4.1: Add note creation to VaultContext

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1:** Ensure createItem handles notes
The existing `createItem` should already accept type='note'. Verify it creates proper frontmatter:
```typescript
// For notes, frontmatter should NOT include status or due
if (type === 'note') {
  frontmatter = {
    type: 'note',
    created: new Date().toISOString(),
  }
}
```

**Verification:**
```bash
grep -A5 "type === 'note'" src/renderer/contexts/VaultContext.tsx || grep "note" src/renderer/contexts/VaultContext.tsx && echo "CHECK: verify note handling"
```

**Commit:** `feat: ensure note creation in VaultContext`

---

### Task 4.2: Create NoteRow component

**Files:**
- Create: `src/renderer/components/task/NoteRow.tsx`

**Step 1:** Create component
```typescript
import React from 'react'
import { VaultNote } from '@shared/types'
import { format } from 'date-fns'

interface NoteRowProps {
  note: VaultNote
  isSelected: boolean
  onSelect: () => void
}

export function NoteRow({ note, isSelected, onSelect }: NoteRowProps) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <span className="text-lg">📝</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {note.title || 'Untitled Note'}
        </p>
        {note.created && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(note.created), 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/task/NoteRow.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add NoteRow component`

---

### Task 4.3: Update TaskList to show notes

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1:** Import NoteRow
```typescript
import { NoteRow } from '../task/NoteRow'
```

**Step 2:** Separate tasks and notes, render both
```typescript
const tasks = items.filter(item => item.type === 'task') as VaultTask[]
const notes = items.filter(item => item.type === 'note') as VaultNote[]

// Render tasks section
// Then render notes section with header:
{notes.length > 0 && (
  <div className="mt-4">
    <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
      Notes
    </h3>
    {notes.map(note => (
      <NoteRow
        key={note.path}
        note={note}
        isSelected={selectedTaskId === note.id}
        onSelect={() => setSelectedTaskId(note.id)}
      />
    ))}
  </div>
)}
```

**Verification:**
```bash
grep "NoteRow" src/renderer/components/layout/TaskList.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: display notes in TaskList`

---

### Task 4.4: Add note creation input

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1:** Add toggle between task and note creation
```typescript
const [createType, setCreateType] = useState<'task' | 'note'>('task')

// Add toggle buttons near the input
<div className="flex gap-1 mb-2">
  <button
    onClick={() => setCreateType('task')}
    className={`px-2 py-1 text-xs rounded ${createType === 'task' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
  >
    Task
  </button>
  <button
    onClick={() => setCreateType('note')}
    className={`px-2 py-1 text-xs rounded ${createType === 'note' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
  >
    Note
  </button>
</div>

// Update create function to use createType
```

**Verification:**
```bash
grep "createType" src/renderer/components/layout/TaskList.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add task/note toggle in creation input`

---

### Task 4.5: Create NoteDetail panel

**Files:**
- Create: `src/renderer/components/layout/NoteDetail.tsx`

**Step 1:** Create component (similar to TaskDetail but without due date/status)
```typescript
import React, { useState, useEffect } from 'react'
import { VaultNote } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'

interface NoteDetailProps {
  note: VaultNote
}

export function NoteDetail({ note }: NoteDetailProps) {
  const { updateItem, deleteItem } = useVault()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content || '')

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content || '')
  }, [note.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        updateItem({ ...note, title, content })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [title, content])

  const handleDelete = async () => {
    await deleteItem(note.path)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 mb-4"
        placeholder="Note title..."
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 w-full p-2 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-md resize-none outline-none text-gray-700 dark:text-gray-300"
        placeholder="Write your note..."
      />

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleDelete}
          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
        >
          Delete Note
        </button>
      </div>
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/layout/NoteDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add NoteDetail component`

---

### Task 4.6: Update detail panel to show notes

**Files:**
- Modify: `src/renderer/App.tsx` or wherever detail panel is rendered

**Step 1:** Detect item type and render appropriate detail panel
```typescript
import { NoteDetail } from './components/layout/NoteDetail'

// In render:
{selectedItem?.type === 'task' && <TaskDetail task={selectedItem} />}
{selectedItem?.type === 'note' && <NoteDetail note={selectedItem} />}
```

**Verification:**
```bash
grep "NoteDetail" src/renderer/App.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: show NoteDetail for notes`

---

### Phase 4 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 4 COMPLETE"
```

Update progress: `current_phase: 5, current_task: 1`

---

## Phase 5: Subtasks

**Goal:** Create and manage subtasks that reference parent tasks.

### Task 5.1: Add subtask creation method

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1:** Add createSubtask method
```typescript
const createSubtask = async (parentId: string, title: string) => {
  const parent = items.get(parentId)
  if (!parent || parent.type !== 'task') return null

  const folder = parent.path.substring(0, parent.path.lastIndexOf('/'))
  const newItem = await createItem('task', folder, title)

  if (newItem) {
    // Update with parent reference
    await updateItem({ ...newItem, parent: parentId } as VaultTask)
  }
  return newItem
}
```

**Step 2:** Add getSubtasks helper
```typescript
const getSubtasks = (parentId: string): VaultTask[] => {
  return Array.from(items.values())
    .filter(item => item.type === 'task' && (item as VaultTask).parent === parentId) as VaultTask[]
}
```

**Step 3:** Export from context

**Verification:**
```bash
grep "createSubtask\|getSubtasks" src/renderer/contexts/VaultContext.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add subtask creation and retrieval`

---

### Task 5.2: Create SubtaskList component

**Files:**
- Create: `src/renderer/components/task/SubtaskList.tsx`

**Step 1:** Create component
```typescript
import React, { useState } from 'react'
import { VaultTask } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'

interface SubtaskListProps {
  parentId: string
}

export function SubtaskList({ parentId }: SubtaskListProps) {
  const { getSubtasks, createSubtask, updateItem } = useVault()
  const [newSubtask, setNewSubtask] = useState('')
  const subtasks = getSubtasks(parentId)

  const handleAdd = async () => {
    if (!newSubtask.trim()) return
    await createSubtask(parentId, newSubtask.trim())
    setNewSubtask('')
  }

  const handleToggle = async (subtask: VaultTask) => {
    await updateItem({
      ...subtask,
      status: subtask.status === 'completed' ? 'pending' : 'completed',
      completed_at: subtask.status === 'pending' ? new Date().toISOString() : undefined,
    })
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Subtasks ({subtasks.length})
      </h4>

      <div className="space-y-1">
        {subtasks.map(subtask => (
          <div key={subtask.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={subtask.status === 'completed'}
              onChange={() => handleToggle(subtask)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {subtask.title}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add subtask..."
          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
        />
        <button
          onClick={handleAdd}
          className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
        >
          Add
        </button>
      </div>
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/task/SubtaskList.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add SubtaskList component`

---

### Task 5.3: Add SubtaskList to TaskDetail

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1:** Import and render SubtaskList
```typescript
import { SubtaskList } from '../task/SubtaskList'

// Add after description, before delete button:
<SubtaskList parentId={task.id} />
```

**Verification:**
```bash
grep "SubtaskList" src/renderer/components/layout/TaskDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: show subtasks in TaskDetail`

---

### Task 5.4: Show subtask count in TaskRow

**Files:**
- Modify: `src/renderer/components/task/TaskRow.tsx`

**Step 1:** Accept subtaskCount prop and display
```typescript
interface TaskRowProps {
  // ... existing
  subtaskCount?: number
  completedSubtaskCount?: number
}

// In render, add after title:
{subtaskCount > 0 && (
  <span className="text-xs text-gray-400 ml-2">
    {completedSubtaskCount}/{subtaskCount}
  </span>
)}
```

**Verification:**
```bash
grep "subtaskCount" src/renderer/components/task/TaskRow.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: show subtask count in TaskRow`

---

### Task 5.5: Test subtask functionality

**Files:**
- Create: `src/renderer/components/task/SubtaskList.test.tsx`

**Step 1:** Create test
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SubtaskList } from './SubtaskList'
import { VaultProvider } from '../../contexts/VaultContext'

// Mock the context
vi.mock('../../contexts/VaultContext', () => ({
  useVault: () => ({
    getSubtasks: vi.fn(() => []),
    createSubtask: vi.fn(),
    updateItem: vi.fn(),
  }),
  VaultProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('SubtaskList', () => {
  it('renders add subtask input', () => {
    render(<SubtaskList parentId="test123" />)
    expect(screen.getByPlaceholderText('Add subtask...')).toBeInTheDocument()
  })

  it('shows subtask count', () => {
    render(<SubtaskList parentId="test123" />)
    expect(screen.getByText(/Subtasks/)).toBeInTheDocument()
  })
})
```

**Verification:**
```bash
npm run test -- src/renderer/components/task/SubtaskList.test.tsx && echo "PASS"
```

**Commit:** `test: add SubtaskList tests`

---

### Phase 5 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 5 COMPLETE"
```

Update progress: `current_phase: 6, current_task: 1`

---

## Phase 6: TipTap Rich Text Editor

**Goal:** Replace textarea with TipTap WYSIWYG markdown editor.

### Task 6.1: Install TipTap

**Files:** `package.json`

**Step 1:** Install dependencies
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link
```

**Verification:**
```bash
cat package.json | grep "@tiptap/react" && echo "PASS"
```

**Commit:** `chore: add TipTap dependencies`

---

### Task 6.2: Create RichTextEditor component

**Files:**
- Create: `src/renderer/components/ui/RichTextEditor.tsx`

**Step 1:** Create component
```typescript
import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <EditorContent editor={editor} className="min-h-[100px] outline-none" />
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/RichTextEditor.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add RichTextEditor component`

---

### Task 6.3: Add editor toolbar

**Files:**
- Modify: `src/renderer/components/ui/RichTextEditor.tsx`

**Step 1:** Add toolbar component
```typescript
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null

  return (
    <div className="flex gap-1 p-1 border-b border-gray-200 dark:border-gray-700 mb-2">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
      >
        •
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
      >
        1.
      </button>
    </div>
  )
}
```

**Step 2:** Use toolbar in main component
```typescript
return (
  <div className={className}>
    <EditorToolbar editor={editor} />
    <EditorContent editor={editor} />
  </div>
)
```

**Verification:**
```bash
grep "EditorToolbar" src/renderer/components/ui/RichTextEditor.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add toolbar to RichTextEditor`

---

### Task 6.4: Add editor styles

**Files:**
- Modify: `src/renderer/styles/globals.css`

**Step 1:** Add TipTap styles
```css
/* TipTap editor styles */
.ProseMirror {
  outline: none;
  min-height: 100px;
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5rem;
}

.ProseMirror ul {
  list-style-type: disc;
}

.ProseMirror ol {
  list-style-type: decimal;
}
```

**Verification:**
```bash
grep "ProseMirror" src/renderer/styles/globals.css && echo "PASS"
```

**Commit:** `style: add TipTap editor styles`

---

### Task 6.5: Use RichTextEditor in TaskDetail

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1:** Replace textarea with RichTextEditor
```typescript
import { RichTextEditor } from '../ui/RichTextEditor'

// Replace:
// <textarea value={content} onChange={...} />

// With:
<RichTextEditor
  content={content}
  onChange={setContent}
  placeholder="Add description..."
  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-md p-2"
/>
```

**Verification:**
```bash
grep "RichTextEditor" src/renderer/components/layout/TaskDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: use RichTextEditor in TaskDetail`

---

### Task 6.6: Use RichTextEditor in NoteDetail

**Files:**
- Modify: `src/renderer/components/layout/NoteDetail.tsx`

**Step 1:** Replace textarea with RichTextEditor
```typescript
import { RichTextEditor } from '../ui/RichTextEditor'

<RichTextEditor
  content={content}
  onChange={setContent}
  placeholder="Write your note..."
  className="flex-1"
/>
```

**Verification:**
```bash
grep "RichTextEditor" src/renderer/components/layout/NoteDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: use RichTextEditor in NoteDetail`

---

### Phase 6 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 6 COMPLETE"
```

Update progress: `current_phase: 7, current_task: 1`

---

## Phase 7: Keyboard Shortcuts

**Goal:** Implement Cmd+N (new task), Cmd+Shift+N (new note), and other shortcuts.

### Task 7.1: Create keyboard shortcuts hook

**Files:**
- Create: `src/renderer/hooks/useKeyboardShortcuts.ts`

**Step 1:** Create hook
```typescript
import { useEffect, useCallback } from 'react'

interface Shortcut {
  key: string
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.alt ? e.altKey : !e.altKey
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

      if (metaMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
```

**Verification:**
```bash
test -f src/renderer/hooks/useKeyboardShortcuts.ts && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add useKeyboardShortcuts hook`

---

### Task 7.2: Implement app-level shortcuts

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1:** Import and use shortcuts hook
```typescript
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

// In App component:
const [showQuickAdd, setShowQuickAdd] = useState(false)
const [quickAddType, setQuickAddType] = useState<'task' | 'note'>('task')

useKeyboardShortcuts([
  {
    key: 'n',
    meta: true,
    action: () => {
      setQuickAddType('task')
      setShowQuickAdd(true)
    },
  },
  {
    key: 'n',
    meta: true,
    shift: true,
    action: () => {
      setQuickAddType('note')
      setShowQuickAdd(true)
    },
  },
  {
    key: 'Escape',
    action: () => setShowQuickAdd(false),
  },
])
```

**Verification:**
```bash
grep "useKeyboardShortcuts" src/renderer/App.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: implement Cmd+N and Cmd+Shift+N shortcuts`

---

### Task 7.3: Create QuickAdd modal

**Files:**
- Create: `src/renderer/components/ui/QuickAddModal.tsx`

**Step 1:** Create modal component
```typescript
import React, { useState, useRef, useEffect } from 'react'
import { useVault } from '../../contexts/VaultContext'

interface QuickAddModalProps {
  type: 'task' | 'note'
  onClose: () => void
}

export function QuickAddModal({ type, onClose }: QuickAddModalProps) {
  const { createItem, settings } = useVault()
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const inboxPath = `${settings?.vaultPath}/Inbox`
    await createItem(type, inboxPath, title.trim())
    setTitle('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="text-xs text-gray-500 mb-2">
            New {type === 'task' ? 'Task' : 'Note'}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${type === 'task' ? 'What needs to be done?' : 'Note title...'}`}
            className="w-full text-lg bg-transparent border-none outline-none text-gray-900 dark:text-gray-100"
          />
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/QuickAddModal.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add QuickAddModal component`

---

### Task 7.4: Render QuickAdd modal in App

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1:** Import and conditionally render modal
```typescript
import { QuickAddModal } from './components/ui/QuickAddModal'

// In render:
{showQuickAdd && (
  <QuickAddModal
    type={quickAddType}
    onClose={() => setShowQuickAdd(false)}
  />
)}
```

**Verification:**
```bash
grep "QuickAddModal" src/renderer/App.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: render QuickAddModal on keyboard shortcut`

---

### Task 7.5: Test keyboard shortcuts

**Files:**
- Create: `src/renderer/hooks/useKeyboardShortcuts.test.ts`

**Step 1:** Create test
```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  it('calls action when shortcut is pressed', () => {
    const action = vi.fn()
    renderHook(() => useKeyboardShortcuts([{ key: 'n', meta: true, action }]))

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      metaKey: true,
    })
    window.dispatchEvent(event)

    expect(action).toHaveBeenCalled()
  })

  it('does not call action without meta key', () => {
    const action = vi.fn()
    renderHook(() => useKeyboardShortcuts([{ key: 'n', meta: true, action }]))

    const event = new KeyboardEvent('keydown', { key: 'n' })
    window.dispatchEvent(event)

    expect(action).not.toHaveBeenCalled()
  })
})
```

**Verification:**
```bash
npm run test -- src/renderer/hooks/useKeyboardShortcuts.test.ts && echo "PASS"
```

**Commit:** `test: add keyboard shortcuts tests`

---

### Phase 7 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 7 COMPLETE"
```

Update progress: `current_phase: 8, current_task: 1`

---

## Phase 8: Recurring Tasks

**Goal:** Implement repeat rules and completion logic for recurring tasks.

### Task 8.1: Create repeat calculation utility

**Files:**
- Create: `src/shared/repeat.ts`

**Step 1:** Create utility
```typescript
import { addDays, addWeeks, addMonths, addYears } from 'date-fns'

export interface RepeatRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  from: 'due_date' | 'completion_date'
  days?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
  ends?: string // ISO date
}

export function getNextDueDate(
  currentDue: string,
  repeat: RepeatRule,
  completedAt: string
): string | null {
  const baseDate = new Date(repeat.from === 'due_date' ? currentDue : completedAt)

  let nextDate: Date
  switch (repeat.frequency) {
    case 'daily':
      nextDate = addDays(baseDate, repeat.interval)
      break
    case 'weekly':
      nextDate = addWeeks(baseDate, repeat.interval)
      break
    case 'monthly':
      nextDate = addMonths(baseDate, repeat.interval)
      break
    case 'yearly':
      nextDate = addYears(baseDate, repeat.interval)
      break
  }

  // Check if past end date
  if (repeat.ends && nextDate > new Date(repeat.ends)) {
    return null
  }

  return nextDate.toISOString()
}
```

**Verification:**
```bash
test -f src/shared/repeat.ts && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add repeat calculation utility`

---

### Task 8.2: Test repeat utility

**Files:**
- Create: `src/shared/repeat.test.ts`

**Step 1:** Create tests
```typescript
import { describe, it, expect } from 'vitest'
import { getNextDueDate, RepeatRule } from './repeat'

describe('getNextDueDate', () => {
  it('calculates daily repeat from due date', () => {
    const rule: RepeatRule = {
      frequency: 'daily',
      interval: 1,
      from: 'due_date',
    }
    const result = getNextDueDate('2026-01-12T09:00:00Z', rule, '2026-01-12T10:00:00Z')
    expect(result).toBe('2026-01-13T09:00:00.000Z')
  })

  it('calculates weekly repeat', () => {
    const rule: RepeatRule = {
      frequency: 'weekly',
      interval: 2,
      from: 'due_date',
    }
    const result = getNextDueDate('2026-01-12T09:00:00Z', rule, '2026-01-12T10:00:00Z')
    expect(result).toBe('2026-01-26T09:00:00.000Z')
  })

  it('returns null if past end date', () => {
    const rule: RepeatRule = {
      frequency: 'daily',
      interval: 1,
      from: 'due_date',
      ends: '2026-01-12T00:00:00Z',
    }
    const result = getNextDueDate('2026-01-12T09:00:00Z', rule, '2026-01-12T10:00:00Z')
    expect(result).toBeNull()
  })
})
```

**Verification:**
```bash
npm run test -- src/shared/repeat.test.ts && echo "PASS"
```

**Commit:** `test: add repeat utility tests`

---

### Task 8.3: Update task completion to handle repeats

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1:** Import repeat utility
```typescript
import { getNextDueDate } from '@shared/repeat'
```

**Step 2:** Update toggleTaskComplete or updateItem to handle repeats
```typescript
const completeTask = async (task: VaultTask) => {
  const completedAt = new Date().toISOString()

  if (task.repeat && task.due) {
    // Recurring task: calculate next due date
    const nextDue = getNextDueDate(task.due, task.repeat, completedAt)

    if (nextDue) {
      // Update with new due date, keep pending
      await updateItem({
        ...task,
        due: nextDue,
        status: 'pending',
        completed_at: undefined,
      })
    } else {
      // No more occurrences, mark complete
      await updateItem({
        ...task,
        status: 'completed',
        completed_at: completedAt,
      })
    }
  } else {
    // Regular task: just mark complete
    await updateItem({
      ...task,
      status: 'completed',
      completed_at: completedAt,
    })
  }
}
```

**Verification:**
```bash
grep "getNextDueDate\|completeTask" src/renderer/contexts/VaultContext.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: handle recurring task completion`

---

### Task 8.4: Create RepeatPicker component

**Files:**
- Create: `src/renderer/components/ui/RepeatPicker.tsx`

**Step 1:** Create component
```typescript
import React from 'react'
import { RepeatRule } from '@shared/repeat'

interface RepeatPickerProps {
  value: RepeatRule | null
  onChange: (rule: RepeatRule | null) => void
}

const presets = [
  { label: 'Daily', rule: { frequency: 'daily' as const, interval: 1, from: 'due_date' as const } },
  { label: 'Weekly', rule: { frequency: 'weekly' as const, interval: 1, from: 'due_date' as const } },
  { label: 'Monthly', rule: { frequency: 'monthly' as const, interval: 1, from: 'due_date' as const } },
  { label: 'Yearly', rule: { frequency: 'yearly' as const, interval: 1, from: 'due_date' as const } },
]

export function RepeatPicker({ value, onChange }: RepeatPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-500">Repeat</label>
      <select
        value={value ? `${value.frequency}-${value.interval}` : 'none'}
        onChange={(e) => {
          if (e.target.value === 'none') {
            onChange(null)
          } else {
            const preset = presets.find(p => `${p.rule.frequency}-${p.rule.interval}` === e.target.value)
            if (preset) onChange(preset.rule)
          }
        }}
        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
      >
        <option value="none">No repeat</option>
        {presets.map(p => (
          <option key={`${p.rule.frequency}-${p.rule.interval}`} value={`${p.rule.frequency}-${p.rule.interval}`}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/RepeatPicker.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add RepeatPicker component`

---

### Task 8.5: Add RepeatPicker to TaskDetail

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1:** Import and use RepeatPicker
```typescript
import { RepeatPicker } from '../ui/RepeatPicker'

// Add after due date picker:
<RepeatPicker
  value={task.repeat}
  onChange={(repeat) => handleRepeatChange(repeat)}
/>
```

**Step 2:** Add handleRepeatChange
```typescript
const handleRepeatChange = (repeat: RepeatRule | null) => {
  updateItem({ ...task, repeat })
}
```

**Verification:**
```bash
grep "RepeatPicker" src/renderer/components/layout/TaskDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add repeat picker to TaskDetail`

---

### Phase 8 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 8 COMPLETE"
```

Update progress: `current_phase: 9, current_task: 1`

---

## Phase 9: Theme Toggle

**Goal:** Add UI control to switch between light and dark modes.

### Task 9.1: Create theme context

**Files:**
- Create: `src/renderer/contexts/ThemeContext.tsx`

**Step 1:** Create context
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) setThemeState(stored)
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateResolved = () => {
      const resolved = theme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : theme
      setResolvedTheme(resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }

    updateResolved()
    mediaQuery.addEventListener('change', updateResolved)
    return () => mediaQuery.removeEventListener('change', updateResolved)
  }, [theme])

  const setTheme = (newTheme: Theme) => setThemeState(newTheme)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

**Verification:**
```bash
test -f src/renderer/contexts/ThemeContext.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add ThemeContext`

---

### Task 9.2: Create ThemeToggle component

**Files:**
- Create: `src/renderer/components/ui/ThemeToggle.tsx`

**Step 1:** Create component
```typescript
import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded ${theme === 'light' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
        title="Light mode"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded ${theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
        title="Dark mode"
      >
        🌙
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded ${theme === 'system' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
        title="System preference"
      >
        💻
      </button>
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/ThemeToggle.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add ThemeToggle component`

---

### Task 9.3: Add ThemeProvider to app

**Files:**
- Modify: `src/renderer/main.tsx`

**Step 1:** Wrap app with ThemeProvider
```typescript
import { ThemeProvider } from './contexts/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
```

**Verification:**
```bash
grep "ThemeProvider" src/renderer/main.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add ThemeProvider to app`

---

### Task 9.4: Add ThemeToggle to Sidebar

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1:** Import and render ThemeToggle at bottom of sidebar
```typescript
import { ThemeToggle } from '../ui/ThemeToggle'

// At bottom of sidebar:
<div className="mt-auto p-2 border-t border-gray-200 dark:border-gray-700">
  <ThemeToggle />
</div>
```

**Verification:**
```bash
grep "ThemeToggle" src/renderer/components/layout/Sidebar.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add theme toggle to sidebar`

---

### Phase 9 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 9 COMPLETE"
```

Update progress: `current_phase: 10, current_task: 1`

---

## Phase 10: Confirmation Dialogs

**Goal:** Add confirmation dialogs for destructive actions.

### Task 10.1: Create ConfirmDialog component

**Files:**
- Create: `src/renderer/components/ui/ConfirmDialog.tsx`

**Step 1:** Create component
```typescript
import React from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmClass = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    default: 'bg-blue-600 hover:bg-blue-700',
  }[variant]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-sm text-white rounded ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/ConfirmDialog.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add ConfirmDialog component`

---

### Task 10.2: Create useConfirm hook

**Files:**
- Create: `src/renderer/hooks/useConfirm.ts`

**Step 1:** Create hook
```typescript
import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmOptions | null
    resolve: ((value: boolean) => void) | null
  }>({ open: false, options: null, resolve: null })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState({ open: false, options: null, resolve: null })
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState({ open: false, options: null, resolve: null })
  }, [state.resolve])

  return {
    confirm,
    dialogProps: state.options
      ? {
          open: state.open,
          ...state.options,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        }
      : null,
  }
}
```

**Verification:**
```bash
test -f src/renderer/hooks/useConfirm.ts && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add useConfirm hook`

---

### Task 10.3: Add confirmation to TaskDetail delete

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1:** Use confirmation before delete
```typescript
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

// In component:
const { confirm, dialogProps } = useConfirm()

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete Task',
    message: 'Are you sure you want to delete this task? This action cannot be undone.',
    confirmLabel: 'Delete',
    variant: 'danger',
  })

  if (confirmed) {
    await deleteItem(task.path)
  }
}

// In render:
{dialogProps && <ConfirmDialog {...dialogProps} />}
```

**Verification:**
```bash
grep "ConfirmDialog\|useConfirm" src/renderer/components/layout/TaskDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add delete confirmation to TaskDetail`

---

### Task 10.4: Add confirmation to NoteDetail delete

**Files:**
- Modify: `src/renderer/components/layout/NoteDetail.tsx`

**Step 1:** Same pattern as TaskDetail
```typescript
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

const { confirm, dialogProps } = useConfirm()

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note? This action cannot be undone.',
    confirmLabel: 'Delete',
    variant: 'danger',
  })

  if (confirmed) {
    await deleteItem(note.path)
  }
}

{dialogProps && <ConfirmDialog {...dialogProps} />}
```

**Verification:**
```bash
grep "ConfirmDialog\|useConfirm" src/renderer/components/layout/NoteDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add delete confirmation to NoteDetail`

---

### Task 10.5: Test confirmation components

**Files:**
- Create: `src/renderer/components/ui/ConfirmDialog.test.tsx`

**Step 1:** Create test
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Delete"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Delete"
        message="Sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

**Verification:**
```bash
npm run test -- src/renderer/components/ui/ConfirmDialog.test.tsx && echo "PASS"
```

**Commit:** `test: add ConfirmDialog tests`

---

### Phase 10 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 10 COMPLETE"
```

Update progress: `current_phase: 11, current_task: 1`

---

## Phase 11: Final Integration & Cleanup

**Goal:** Final verification, cleanup, and documentation.

### Task 11.1: Run full test suite

**Step 1:** Run all tests with coverage
```bash
npm run test:coverage
```

**Verification:** Coverage report shows all tests passing.

**Commit:** (none - verification only)

---

### Task 11.2: Run typecheck

**Step 1:** Verify no TypeScript errors
```bash
npm run typecheck
```

**Verification:** Exit code 0, no errors.

**Commit:** (none - verification only)

---

### Task 11.3: Build and test app

**Step 1:** Build main process
```bash
npm run build:main
```

**Step 2:** Start dev server and verify app launches
```bash
npm run electron:dev
```

**Verification:** App launches without errors, all features work.

**Commit:** (none - verification only)

---

### Task 11.4: Update progress file and complete

**Step 1:** Update `.claude/taskvault-v2-progress.yaml`:
```yaml
current_phase: 11
current_task: 4
completed_phases: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
notes: "All deficiencies implemented"
```

**Step 2:** Final commit
```bash
git add -A
git commit -m "feat: complete TaskVault v2 deficiency implementation

- Test infrastructure (Vitest + Testing Library)
- UI polish (empty states, loading, error boundary)
- Date/time picker (react-datepicker)
- Notes support (CRUD, NoteDetail)
- Subtasks (SubtaskList, parent references)
- Rich text editor (TipTap)
- Keyboard shortcuts (Cmd+N, Cmd+Shift+N)
- Recurring tasks (repeat rules, completion logic)
- Theme toggle (light/dark/system)
- Confirmation dialogs (delete protection)
"
```

---

## Completion

All phases complete. Output:

```
<promise>DEFICIENCIES COMPLETE</promise>
```

---

## Escape Hatch

If stuck after 20 iterations:
1. Document what's blocking progress in `.claude/taskvault-v2-progress.yaml`
2. List what was attempted
3. Suggest alternative approaches
4. Output: `<promise>DEFICIENCIES BLOCKED</promise>`

---

## Summary

| Phase | Feature | Tasks |
|-------|---------|-------|
| 1 | Test Infrastructure | 5 |
| 2 | UI Polish | 6 |
| 3 | Date Picker | 4 |
| 4 | Notes Support | 6 |
| 5 | Subtasks | 5 |
| 6 | TipTap Editor | 6 |
| 7 | Keyboard Shortcuts | 5 |
| 8 | Recurring Tasks | 5 |
| 9 | Theme Toggle | 4 |
| 10 | Confirmation Dialogs | 5 |
| 11 | Final Integration | 4 |

**Total: 11 phases, 55 tasks**

Estimated Ralph iterations: 30-50 (with debugging and retries)
