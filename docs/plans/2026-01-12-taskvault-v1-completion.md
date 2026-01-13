# TaskVault V1 Completion Plan

> **For Claude:** Execute this plan iteratively. Track progress in `.claude/taskvault-v1-progress.yaml`. Output `<promise>V1 COMPLETE</promise>` when all phases pass verification.

**Goal:** Complete all missing V1 features identified in the codebase audit.

**Priority Order:** Safety → UX Essentials → Core Features → Polish

---

## Ralph Loop Instructions

### Progress Tracking

On each iteration:
1. Read `.claude/taskvault-v1-progress.yaml` (create if missing)
2. Resume from `current_phase` and `current_task`
3. Execute that task completely
4. Run verification command
5. If verification fails → debug, fix, re-verify (do NOT advance)
6. If verification passes → update progress file, commit, continue to next task

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
<promise>V1 COMPLETE</promise>
```

---

## Phase 1: Confirmation Dialogs (Safety First)

**Goal:** Protect users from accidental data loss with confirmation dialogs.

### Task 1.1: Create ConfirmDialog component

**Files:** Create `src/renderer/components/ui/ConfirmDialog.tsx`

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
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-4">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded"
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

### Task 1.2: Create useConfirm hook

**Files:** Create `src/renderer/hooks/useConfirm.ts`

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

### Task 1.3: Add confirmation to TaskDetail delete

**Files:** Modify `src/renderer/components/layout/TaskDetail.tsx`

**Changes:**
1. Import ConfirmDialog and useConfirm
2. Use confirmation before delete
3. Render ConfirmDialog in component

**Verification:**
```bash
grep -q "ConfirmDialog" src/renderer/components/layout/TaskDetail.tsx && grep -q "useConfirm" src/renderer/components/layout/TaskDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add delete confirmation to TaskDetail`

---

### Task 1.4: Add confirmation to NoteDetail delete

**Files:** Modify `src/renderer/components/layout/NoteDetail.tsx`

**Changes:** Same pattern as TaskDetail

**Verification:**
```bash
grep -q "ConfirmDialog" src/renderer/components/layout/NoteDetail.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add delete confirmation to NoteDetail`

---

### Task 1.5: Test ConfirmDialog

**Files:** Create `src/renderer/components/ui/ConfirmDialog.test.tsx`

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

  it('calls onConfirm when confirm clicked', () => {
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

  it('calls onCancel when cancel clicked', () => {
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

### Phase 1 Complete Verification

```bash
npm run test && npm run typecheck && echo "PHASE 1 COMPLETE"
```

Update progress: `current_phase: 2, current_task: 1, completed_phases: [1]`

---

## Phase 2: Theme System

**Goal:** Add light/dark/system theme toggle with persistence.

### Task 2.1: Create ThemeContext

**Files:** Create `src/renderer/contexts/ThemeContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

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

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolvedTheme }}>
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

**Commit:** `feat: add ThemeContext for theme management`

---

### Task 2.2: Create ThemeToggle component

**Files:** Create `src/renderer/components/ui/ThemeToggle.tsx`

```typescript
import { useTheme } from '../../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded text-sm ${theme === 'light' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        title="Light mode"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded text-sm ${theme === 'dark' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        title="Dark mode"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded text-sm ${theme === 'system' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        title="System preference"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.321a.75.75 0 01-.557 1.392l-1.395-.558a.75.75 0 01-.457-.456L11 14h-2l-.298 1.188a.75.75 0 01-.457.456l-1.395.558a.75.75 0 11-.557-1.392l.804-.32L7.22 14H5a2 2 0 01-2-2V5zm2 0h10v8H5V5z" clipRule="evenodd" />
        </svg>
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

### Task 2.3: Wire ThemeProvider into app

**Files:** Modify `src/renderer/App.tsx`

**Changes:**
1. Import ThemeProvider from contexts/ThemeContext
2. Wrap the entire app with ThemeProvider (outermost provider)

**Verification:**
```bash
grep -q "ThemeProvider" src/renderer/App.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add ThemeProvider to app`

---

### Task 2.4: Add ThemeToggle to Sidebar

**Files:** Modify `src/renderer/components/layout/Sidebar.tsx`

**Changes:**
1. Import ThemeToggle
2. Add it in the bottom section before "New Folder" button

**Verification:**
```bash
grep -q "ThemeToggle" src/renderer/components/layout/Sidebar.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add theme toggle to sidebar`

---

### Task 2.5: Add light theme CSS support

**Files:** Modify `src/renderer/styles/globals.css`

**Changes:** Ensure light mode styles work. Add light mode overrides if needed:
```css
/* Light mode base - when no .dark class */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
}

.dark {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #374151;
}
```

**Verification:**
```bash
grep -q "dark {" src/renderer/styles/globals.css && echo "PASS"
```

**Commit:** `style: add light/dark theme CSS variables`

---

### Phase 2 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 2 COMPLETE"
```

Update progress: `current_phase: 3, current_task: 1, completed_phases: [1, 2]`

---

## Phase 3: Quick Add Keyboard Shortcuts

**Goal:** Implement Cmd+N (new task) and Cmd+Shift+N (new note) shortcuts.

### Task 3.1: Create QuickAddModal component

**Files:** Create `src/renderer/components/ui/QuickAddModal.tsx`

```typescript
import { useState, useRef, useEffect } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'

interface QuickAddModalProps {
  type: 'task' | 'note'
  onClose: () => void
}

export function QuickAddModal({ type, onClose }: QuickAddModalProps) {
  const { createItem, vaultPath } = useVault()
  const { selectedView, selectedPath } = useUI()
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !vaultPath) return

    // Determine target folder
    const targetFolder = selectedPath || `${vaultPath}/Inbox`
    await createItem(type, targetFolder, title.trim())
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-4">
          <div className="text-xs text-gray-500 mb-2">
            New {type === 'task' ? 'Task' : 'Note'}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={type === 'task' ? 'What needs to be done?' : 'Note title...'}
            className="w-full text-lg bg-transparent border-none outline-none text-gray-100 placeholder-gray-500"
          />
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm text-gray-400 hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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

### Task 3.2: Add QuickAdd state to UIContext

**Files:** Modify `src/renderer/contexts/UIContext.tsx`

**Changes:** Add state and methods for quick add modal:
```typescript
interface UIContextType {
  // ... existing
  showQuickAdd: boolean
  quickAddType: 'task' | 'note'
  openQuickAdd: (type: 'task' | 'note') => void
  closeQuickAdd: () => void
}
```

**Verification:**
```bash
grep -q "showQuickAdd" src/renderer/contexts/UIContext.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add quick add state to UIContext`

---

### Task 3.3: Update useKeyboardShortcuts for Cmd+N

**Files:** Modify `src/renderer/hooks/useKeyboardShortcuts.ts`

**Changes:** Add Cmd+N and Cmd+Shift+N handlers:
```typescript
// Cmd/Ctrl+N for new task
if (e.key === 'n' && modifier && !e.shiftKey) {
  e.preventDefault()
  openQuickAdd('task')
}

// Cmd/Ctrl+Shift+N for new note
if (e.key === 'n' && modifier && e.shiftKey) {
  e.preventDefault()
  openQuickAdd('note')
}
```

**Verification:**
```bash
grep -q "openQuickAdd" src/renderer/hooks/useKeyboardShortcuts.ts && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add Cmd+N and Cmd+Shift+N shortcuts`

---

### Task 3.4: Render QuickAddModal in App

**Files:** Modify `src/renderer/App.tsx`

**Changes:**
1. Import QuickAddModal
2. Get showQuickAdd, quickAddType, closeQuickAdd from UIContext
3. Render QuickAddModal conditionally

**Verification:**
```bash
grep -q "QuickAddModal" src/renderer/App.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: render QuickAddModal on keyboard shortcut`

---

### Phase 3 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 3 COMPLETE"
```

Update progress: `current_phase: 4, current_task: 1, completed_phases: [1, 2, 3]`

---

## Phase 4: Context Menus

**Goal:** Add right-click context menus for tasks/notes with common actions.

### Task 4.1: Create ContextMenu component

**Files:** Create `src/renderer/components/ui/ContextMenu.tsx`

```typescript
import { useEffect, useRef, type ReactNode } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  children: ReactNode
}

export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  )
}

interface ContextMenuItemProps {
  onClick: () => void
  variant?: 'default' | 'danger'
  children: ReactNode
}

export function ContextMenuItem({ onClick, variant = 'default', children }: ContextMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-1.5 text-left text-sm ${
        variant === 'danger'
          ? 'text-red-400 hover:bg-red-900/30'
          : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
```

**Verification:**
```bash
test -f src/renderer/components/ui/ContextMenu.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add ContextMenu component`

---

### Task 4.2: Create useContextMenu hook

**Files:** Create `src/renderer/hooks/useContextMenu.ts`

```typescript
import { useState, useCallback } from 'react'

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  data: unknown
}

export function useContextMenu<T>() {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    data: null,
  })

  const open = useCallback((e: React.MouseEvent, data: T) => {
    e.preventDefault()
    setState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      data,
    })
  }, [])

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return {
    isOpen: state.isOpen,
    x: state.x,
    y: state.y,
    data: state.data as T,
    open,
    close,
  }
}
```

**Verification:**
```bash
test -f src/renderer/hooks/useContextMenu.ts && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add useContextMenu hook`

---

### Task 4.3: Add context menu to TaskRow

**Files:** Modify `src/renderer/components/task/TaskRow.tsx`

**Changes:**
1. Import ContextMenu, ContextMenuItem, useContextMenu
2. Add onContextMenu handler to row
3. Show menu with: Delete, Duplicate, Convert to Note options

**Verification:**
```bash
grep -q "ContextMenu" src/renderer/components/task/TaskRow.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add context menu to TaskRow`

---

### Task 4.4: Add context menu to NoteRow

**Files:** Modify `src/renderer/components/task/NoteRow.tsx`

**Changes:** Same pattern as TaskRow with: Delete, Duplicate, Convert to Task options

**Verification:**
```bash
grep -q "ContextMenu" src/renderer/components/task/NoteRow.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add context menu to NoteRow`

---

### Phase 4 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 4 COMPLETE"
```

Update progress: `current_phase: 5, current_task: 1, completed_phases: [1, 2, 3, 4]`

---

## Phase 5: Task/Note Conversion

**Goal:** Allow converting tasks to notes and vice versa.

### Task 5.1: Add convertItem method to VaultContext

**Files:** Modify `src/renderer/contexts/VaultContext.tsx`

**Changes:** Add method to convert between task and note:
```typescript
const convertItem = async (item: VaultItem, toType: 'task' | 'note') => {
  if (item.meta.type === toType) return

  const newMeta = toType === 'task'
    ? { ...item.meta, type: 'task', status: 'pending', due: null }
    : { ...item.meta, type: 'note', status: undefined, due: undefined }

  await updateItem({ ...item, meta: newMeta })
}
```

**Verification:**
```bash
grep -q "convertItem" src/renderer/contexts/VaultContext.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add convertItem method to VaultContext`

---

### Task 5.2: Wire conversion into context menus

**Files:** Modify `src/renderer/components/task/TaskRow.tsx` and `NoteRow.tsx`

**Changes:** Call convertItem when Convert menu item is clicked

**Verification:**
```bash
grep -q "convertItem" src/renderer/components/task/TaskRow.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: wire task/note conversion to context menus`

---

### Phase 5 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 5 COMPLETE"
```

Update progress: `current_phase: 6, current_task: 1, completed_phases: [1, 2, 3, 4, 5]`

---

## Phase 6: New Folder Functionality

**Goal:** Make the "New Folder" button actually work.

### Task 6.1: Add createFolder method to VaultContext

**Files:** Modify `src/renderer/contexts/VaultContext.tsx`

**Changes:** Add method to create folders:
```typescript
const createFolder = async (name: string, parentPath?: string) => {
  const basePath = parentPath || vaultPath
  await window.api.createFolder(basePath, name)
}
```

**Verification:**
```bash
grep -q "createFolder" src/renderer/contexts/VaultContext.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add createFolder method`

---

### Task 6.2: Add createFolder IPC handler

**Files:** Modify `src/main/ipc.ts` and `src/main/services/file-service.ts`

**Changes:**
1. Add IPC handler for folder creation
2. Implement file-service method to create folder with _folder.md

**Verification:**
```bash
grep -q "createFolder" src/main/ipc.ts && npm run typecheck && echo "PASS"
```

**Commit:** `feat: add createFolder IPC handler`

---

### Task 6.3: Update preload with createFolder

**Files:** Modify `src/preload/index.ts`

**Changes:** Expose createFolder method

**Verification:**
```bash
grep -q "createFolder" src/preload/index.ts && npm run typecheck && echo "PASS"
```

**Commit:** `feat: expose createFolder in preload`

---

### Task 6.4: Wire New Folder button in Sidebar

**Files:** Modify `src/renderer/components/layout/Sidebar.tsx`

**Changes:**
1. Add state for showing folder name input
2. Handle click on "New Folder" to show input
3. Create folder on submit

**Verification:**
```bash
grep -q "createFolder" src/renderer/components/layout/Sidebar.tsx && npm run typecheck && echo "PASS"
```

**Commit:** `feat: wire New Folder button in Sidebar`

---

### Phase 6 Complete Verification

```bash
npm run typecheck && npm run test && echo "PHASE 6 COMPLETE"
```

Update progress: `current_phase: 7, current_task: 1, completed_phases: [1, 2, 3, 4, 5, 6]`

---

## Phase 7: Final Integration & Cleanup

**Goal:** Final verification and polish.

### Task 7.1: Run full test suite

```bash
npm run test
```

**Verification:** All tests pass

---

### Task 7.2: Run typecheck

```bash
npm run typecheck
```

**Verification:** No errors

---

### Task 7.3: Build and verify app launches

```bash
npm run build:main
```

**Verification:** Build succeeds

---

### Task 7.4: Update progress file

Update `.claude/taskvault-v1-progress.yaml`:
```yaml
current_phase: 7
current_task: 4
completed_phases: [1, 2, 3, 4, 5, 6, 7]
notes: "All V1 features implemented"
```

**Commit:**
```bash
git add -A && git commit -m "feat: complete TaskVault V1 implementation

- Confirmation dialogs for destructive actions
- Light/dark/system theme toggle
- Cmd+N / Cmd+Shift+N keyboard shortcuts
- Context menus with delete, duplicate, convert
- Task ↔ Note conversion
- New Folder functionality
"
```

---

## Completion

All phases complete. Output:

```
<promise>V1 COMPLETE</promise>
```

---

## Escape Hatch

If stuck after 25 iterations:
1. Document blocking issue in `.claude/taskvault-v1-progress.yaml`
2. List attempted solutions
3. Output: `<promise>V1 BLOCKED</promise>`

---

## Summary

| Phase | Feature | Tasks |
|-------|---------|-------|
| 1 | Confirmation Dialogs | 5 |
| 2 | Theme System | 5 |
| 3 | Quick Add Shortcuts | 4 |
| 4 | Context Menus | 4 |
| 5 | Task/Note Conversion | 2 |
| 6 | New Folder | 4 |
| 7 | Final Integration | 4 |

**Total: 7 phases, 28 tasks**

---

## Out of Scope (Future Work)

These V1 design features require more significant work and are deferred:

- **ReminderService / Notifications** - Requires Electron notification API, scheduling logic
- **Tray/Menu Bar Icon** - Requires tray.ts implementation, app lifecycle changes
- **Drag reorder within lists** - Requires @dnd-kit/sortable integration
- **Double-click inline edit** - UX enhancement, not critical for V1
