# Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add resizable panels, responsive breakpoints, and mobile navigation to Task Vault.

**Architecture:** Use `react-resizable-panels` for drag-to-resize. Create a `useLayoutMode` hook to determine layout (full/compact/mobile) based on window width. Add navigation history for back/forward in mobile mode. Move task detail header content inline with body.

**Tech Stack:** React, TypeScript, react-resizable-panels, Tailwind CSS, Vitest

---

## Task 0: Lower app min width for responsive modes

**Files:**
- Modify: `src/main/index.ts`

**Step 1: Update Electron window constraints**

Set the minimum width to 320 so compact/mobile modes are reachable:

```typescript
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 320,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    // ...
  })
```

**Step 2: Commit**

```bash
git add src/main/index.ts
git commit -m "chore: lower min window width for responsive layouts"
```

---

## Task 1: Install react-resizable-panels

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install react-resizable-panels`

**Step 2: Verify installation**

Run: `npm ls react-resizable-panels`
Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-resizable-panels dependency"
```

---

## Task 2: Create useLayoutMode hook

**Files:**
- Create: `src/renderer/hooks/useLayoutMode.ts`
- Test: `src/renderer/hooks/useLayoutMode.test.ts`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLayoutMode } from './useLayoutMode'

describe('useLayoutMode', () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('returns "full" for width >= 900', () => {
    Object.defineProperty(window, 'innerWidth', { value: 900, writable: true })
    const { result } = renderHook(() => useLayoutMode())
    expect(result.current).toBe('full')
  })

  it('returns "compact" for width 640-899', () => {
    Object.defineProperty(window, 'innerWidth', { value: 700, writable: true })
    const { result } = renderHook(() => useLayoutMode())
    expect(result.current).toBe('compact')
  })

  it('returns "mobile" for width < 640', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
    const { result } = renderHook(() => useLayoutMode())
    expect(result.current).toBe('mobile')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/renderer/hooks/useLayoutMode.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
import { useMemo } from 'react'
import { useWindowSize } from './useWindowSize'

export type LayoutMode = 'full' | 'compact' | 'mobile'

const BREAKPOINT_FULL = 900
const BREAKPOINT_COMPACT = 640

export function useLayoutMode(): LayoutMode {
  const { width } = useWindowSize()

  return useMemo(() => {
    if (width >= BREAKPOINT_FULL) return 'full'
    if (width >= BREAKPOINT_COMPACT) return 'compact'
    return 'mobile'
  }, [width])
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/renderer/hooks/useLayoutMode.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/hooks/useLayoutMode.ts src/renderer/hooks/useLayoutMode.test.ts
git commit -m "feat: add useLayoutMode hook for responsive breakpoints"
```

---

## Task 3: Add navigation history to UIContext

**Files:**
- Modify: `src/renderer/contexts/UIContext.tsx`
- Test: `src/renderer/contexts/UIContext.test.tsx`

**Step 1: Add navigation types and helpers**

```typescript
type NavigationState = { view: ViewType, path: string | null, taskId: string | null }
```

**Step 2: Add navigation state + API to UIContextValue**

```typescript
interface UIContextValue {
  // ...
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
}
```

**Step 3: Implement history stack in UIProvider**

Use a ref flag to avoid re-pushing when applying history:

```typescript
const [navHistory, setNavHistory] = useState<NavigationState[]>([])
const [navIndex, setNavIndex] = useState(-1)
const suppressNavRef = useRef(false)

const pushNavState = useCallback((state: NavigationState) => {
  if (suppressNavRef.current) return
  setNavHistory(prev => [...prev.slice(0, navIndex + 1), state])
  setNavIndex(prev => prev + 1)
}, [navIndex])

const setSelectedView = useCallback((view: ViewType, path?: string) => {
  setSelectedViewState(view)
  setSelectedPath(path || null)
  setSelectedTaskId(null)
  pushNavState({ view, path: path || null, taskId: null })
}, [pushNavState])

const setSelectedTaskIdWithNav = useCallback((id: string | null) => {
  setSelectedTaskId(id)
  pushNavState({ view: selectedView, path: selectedPath, taskId: id })
}, [pushNavState, selectedView, selectedPath])

const canGoBack = navIndex > 0
const canGoForward = navIndex < navHistory.length - 1

const applyNavState = useCallback((state: NavigationState) => {
  suppressNavRef.current = true
  setSelectedViewState(state.view)
  setSelectedPath(state.path)
  setSelectedTaskId(state.taskId)
  queueMicrotask(() => { suppressNavRef.current = false })
}, [])

const goBack = useCallback(() => {
  if (!canGoBack) return
  const prev = navHistory[navIndex - 1]
  setNavIndex(prevIndex => prevIndex - 1)
  applyNavState(prev)
}, [canGoBack, navHistory, navIndex, applyNavState])

const goForward = useCallback(() => {
  if (!canGoForward) return
  const next = navHistory[navIndex + 1]
  setNavIndex(prevIndex => prevIndex + 1)
  applyNavState(next)
}, [canGoForward, navHistory, navIndex, applyNavState])
```

**Step 4: Update provider value to expose navigation + replace setSelectedTaskId**

```typescript
value={{
  // ...
  setSelectedTaskId: setSelectedTaskIdWithNav,
  canGoBack,
  canGoForward,
  goBack,
  goForward,
}}
```

**Step 5: Add/Update tests**

- Cover initial history, push-on-selection, and back/forward behavior.

**Step 6: Commit**

```bash
git add src/renderer/contexts/UIContext.tsx src/renderer/contexts/UIContext.test.tsx
git commit -m "feat: add navigation history to UIContext"
```

---

## Task 4: Create useLayoutPersistence hook

**Files:**
- Create: `src/renderer/hooks/useLayoutPersistence.ts`
- Test: `src/renderer/hooks/useLayoutPersistence.test.ts`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLayoutPersistence } from './useLayoutPersistence'

describe('useLayoutPersistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default sizes when no stored value', () => {
    const { result } = renderHook(() => useLayoutPersistence())
    expect(result.current.sizes).toEqual({
      sidebarPx: 256,
      taskListPercent: 40,
      taskDetailPercent: 60,
    })
  })

  it('persists sizes to localStorage', () => {
    const { result } = renderHook(() => useLayoutPersistence())

    act(() => {
      result.current.setSizes({ sidebarPx: 300, taskListPercent: 50, taskDetailPercent: 50 })
    })

    const stored = JSON.parse(localStorage.getItem('panel-sizes') || '{}')
    expect(stored.sidebarPx).toBe(300)
  })

  it('restores sizes from localStorage', () => {
    localStorage.setItem('panel-sizes', JSON.stringify({
      sidebarPx: 200,
      taskListPercent: 45,
      taskDetailPercent: 55,
    }))

    const { result } = renderHook(() => useLayoutPersistence())
    expect(result.current.sizes.sidebarPx).toBe(200)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/renderer/hooks/useLayoutPersistence.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'panel-sizes'

interface PanelSizes {
  sidebarPx: number
  taskListPercent: number
  taskDetailPercent: number
}

const DEFAULT_SIZES: PanelSizes = {
  sidebarPx: 256,
  taskListPercent: 40,
  taskDetailPercent: 60,
}

export function useLayoutPersistence() {
  const [sizes, setSizesState] = useState<PanelSizes>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_SIZES, ...JSON.parse(stored) }
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SIZES
  })

  const setSizes = useCallback((newSizes: Partial<PanelSizes>) => {
    setSizesState(prev => ({ ...prev, ...newSizes }))
  }, [])

  // Persist to localStorage when sizes change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
    } catch {
      // Ignore storage errors
    }
  }, [sizes])

  return { sizes, setSizes }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/renderer/hooks/useLayoutPersistence.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/hooks/useLayoutPersistence.ts src/renderer/hooks/useLayoutPersistence.test.ts
git commit -m "feat: add useLayoutPersistence hook for saving panel sizes"
```

---

## Task 5: Update UIContext with layoutMode + focusMode (remove auto-collapse)

**Files:**
- Modify: `src/renderer/contexts/UIContext.tsx:32-49` (interface)
- Modify: `src/renderer/contexts/UIContext.tsx:53-134` (provider)

**Step 1: Update the UIContextValue interface**

```typescript
interface UIContextValue {
  selectedView: ViewType
  selectedPath: string | null
  selectedTaskId: string | null
  sidebarCollapsed: boolean
  sidebarManuallyCollapsed: boolean
  windowWidth: number
  layoutMode: LayoutMode
  focusMode: boolean
  showQuickAdd: boolean
  quickAddType: 'task' | 'note'
  collapsedSections: Set<string>
  setSelectedView: (view: ViewType, path?: string) => void
  setSelectedTaskId: (id: string | null) => void
  toggleSidebar: () => void
  toggleFocusMode: () => void
  toggleSectionCollapse: (sectionName: string) => void
  isSectionCollapsed: (sectionName: string) => boolean
  openQuickAdd: (type: 'task' | 'note') => void
  closeQuickAdd: () => void
}
```

**Step 2: Update imports at top of file**

```typescript
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ViewType } from '@shared/types'
import { useWindowSize } from '../hooks/useWindowSize'
import { useLayoutMode, type LayoutMode } from '../hooks/useLayoutMode'
```

**Step 3: Update UIProvider with new state**

```typescript
const [focusMode, setFocusMode] = useState(false)
const layoutMode = useLayoutMode()

// Auto-exit focus mode when entering mobile layout
useEffect(() => {
  if (layoutMode === 'mobile') {
    setFocusMode(false)
  }
}, [layoutMode])

const toggleFocusMode = useCallback(() => {
  setFocusMode(prev => !prev)
}, [])
```

**Step 4: Remove auto-collapse breakpoint**

Use only manual collapse (layoutMode controls whether the sidebar is shown at all):

```typescript
const sidebarCollapsed = sidebarManuallyCollapsed
```

Remove the `SIDEBAR_COLLAPSE_BREAKPOINT` constant and any width-based collapse logic.

**Step 5: Update the Provider value**

```typescript
value={{
  // ... existing values
  layoutMode,
  focusMode,
  toggleFocusMode,
}}
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: May have errors from components not yet updated - that's OK

**Step 7: Commit**

```bash
git add src/renderer/contexts/UIContext.tsx
git commit -m "feat: add layoutMode and focusMode to UIContext"
```

---

## Task 6: Create ResizablePanelLayout component

**Files:**
- Create: `src/renderer/components/layout/ResizablePanelLayout.tsx`

**Step 1: Create the component**

```typescript
import { useCallback, useRef, useMemo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels'
import { useUI } from '../../contexts/UIContext'
import { useLayoutPersistence } from '../../hooks/useLayoutPersistence'
import { useWindowSize } from '../../hooks/useWindowSize'
import { Sidebar } from './Sidebar'
import { TaskList } from './TaskList'
import { TaskDetail } from './TaskDetail'
import { NoteDetail } from './NoteDetail'
import { useVault } from '../../contexts/VaultContext'
import type { VaultNote } from '@shared/types'

const SIDEBAR_MIN_PX = 180
const SIDEBAR_MAX_PX = 400
const SIDEBAR_COLLAPSED_PX = 56
const MAIN_PANEL_MIN_PX = 320

export function ResizablePanelLayout() {
  const { selectedTaskId, layoutMode, focusMode, sidebarCollapsed } = useUI()
  const { items } = useVault()
  const { sizes, setSizes } = useLayoutPersistence()
  const { width: windowWidth } = useWindowSize()
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null
  const isNote = selectedItem?.meta.type === 'note'

  const sidebarWidthPx = sidebarCollapsed ? SIDEBAR_COLLAPSED_PX : sizes.sidebarPx
  const sidebarPercent = (sidebarWidthPx / windowWidth) * 100
  const sidebarMinPercent = (SIDEBAR_COLLAPSED_PX / windowWidth) * 100
  const sidebarMaxPercent = (SIDEBAR_MAX_PX / windowWidth) * 100

  const mainPanelMinPercent = useMemo(() => {
    const available = Math.max(
      windowWidth - (layoutMode === 'full' ? sidebarWidthPx : 0),
      MAIN_PANEL_MIN_PX
    )
    return Math.min(100, (MAIN_PANEL_MIN_PX / available) * 100)
  }, [windowWidth, layoutMode, sidebarWidthPx])

  // Handle sidebar collapse via drag
  const handleSidebarResize = useCallback((size: number) => {
    const pixelWidth = (size / 100) * windowWidth
    if (pixelWidth < SIDEBAR_MIN_PX && pixelWidth > SIDEBAR_COLLAPSED_PX) {
      sidebarPanelRef.current?.collapse()
      return
    }
    const clamped = Math.min(Math.max(pixelWidth, SIDEBAR_MIN_PX), SIDEBAR_MAX_PX)
    setSizes({ sidebarPx: clamped })
  }, [setSizes, windowWidth])

  const handleMainPanelResize = useCallback((layout: number[]) => {
    if (layout.length < 2) return
    setSizes({
      taskListPercent: layout[0],
      taskDetailPercent: layout[1],
    })
  }, [setSizes])

  // Focus mode - show only task detail
  if (focusMode && selectedTaskId) {
    return (
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-hidden">
          {isNote ? (
            <NoteDetail note={selectedItem as VaultNote} />
          ) : (
            <TaskDetail />
          )}
        </div>
      </div>
    )
  }

  // Mobile mode - single panel
  if (layoutMode === 'mobile') {
    return (
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-hidden">
          {selectedTaskId ? (
            isNote ? (
              <NoteDetail note={selectedItem as VaultNote} />
            ) : (
              <TaskDetail />
            )
          ) : (
            <TaskList />
          )}
        </div>
      </div>
    )
  }

  // Compact mode - no sidebar
  if (layoutMode === 'compact') {
    return (
      <PanelGroup direction="horizontal" onLayout={handleMainPanelResize}>
        <Panel defaultSize={sizes.taskListPercent} minSize={mainPanelMinPercent}>
          <TaskList />
        </Panel>
        {selectedTaskId && (
          <>
            <PanelResizeHandle
              className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
              aria-label="Resize panels"
              tabIndex={0}
            />
            <Panel defaultSize={sizes.taskDetailPercent} minSize={mainPanelMinPercent}>
              {isNote ? (
                <NoteDetail note={selectedItem as VaultNote} />
              ) : (
                <TaskDetail />
              )}
            </Panel>
          </>
        )}
      </PanelGroup>
    )
  }

  // Full mode - sidebar + task list + task detail
  return (
    <PanelGroup direction="horizontal">
      <Panel
        ref={sidebarPanelRef}
        defaultSize={sidebarPercent}
        minSize={sidebarMinPercent}
        maxSize={sidebarMaxPercent}
        collapsible
        collapsedSize={sidebarMinPercent}
        onResize={handleSidebarResize}
      >
        <Sidebar />
      </Panel>
      <PanelResizeHandle
        className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
        aria-label="Resize panels"
        tabIndex={0}
      />
      <Panel minSize={mainPanelMinPercent}>
        <PanelGroup direction="horizontal" onLayout={handleMainPanelResize}>
          <Panel defaultSize={selectedTaskId ? sizes.taskListPercent : 100} minSize={mainPanelMinPercent}>
            <TaskList />
          </Panel>
          {selectedTaskId && (
            <>
              <PanelResizeHandle
                className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
                aria-label="Resize panels"
                tabIndex={0}
              />
              <Panel defaultSize={sizes.taskDetailPercent} minSize={mainPanelMinPercent}>
                {isNote ? (
                  <NoteDetail note={selectedItem as VaultNote} />
                ) : (
                  <TaskDetail />
                )}
              </Panel>
            </>
          )}
        </PanelGroup>
      </Panel>
    </PanelGroup>
  )
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (or errors in App.tsx which we'll fix next)

**Step 3: Commit**

```bash
git add src/renderer/components/layout/ResizablePanelLayout.tsx
git commit -m "feat: add ResizablePanelLayout component with react-resizable-panels"
```

---

## Task 7: Update TitleBar for mobile navigation and focus mode

**Files:**
- Modify: `src/renderer/components/layout/TitleBar.tsx`

**Step 1: Replace entire TitleBar component**

```typescript
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { useUI } from '../../contexts/UIContext'

export function TitleBar() {
  const { sidebarCollapsed, toggleSidebar, layoutMode, focusMode, toggleFocusMode, selectedTaskId, canGoBack, canGoForward, goBack, goForward } = useUI()

  const showBackForward = layoutMode === 'mobile' || focusMode
  const showSidebarToggle = layoutMode === 'full' && !focusMode
  const showFocusToggle = selectedTaskId && layoutMode !== 'mobile'

  return (
    <div
      className="h-10 bg-white dark:bg-gray-900 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 shrink-0 px-4"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side: traffic lights spacer + navigation */}
      <div className="flex items-center gap-2">
        <div className="w-16" />

        {showSidebarToggle && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
              )}
            </svg>
          </button>
        )}

        {showBackForward && (
          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title="Go back"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title="Go forward"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Right side: focus mode toggle */}
      <div className="flex items-center gap-2">
        {showFocusToggle && (
          <button
            onClick={toggleFocusMode}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
          >
            {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
        {!showFocusToggle && <div className="w-8" />}
      </div>
    </div>
  )
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: May show errors until App.tsx is updated

**Step 3: Commit**

```bash
git add src/renderer/components/layout/TitleBar.tsx
git commit -m "feat: update TitleBar with back/forward nav and focus mode toggle"
```

---

## Task 8: Update TaskDetail layout - move header content to body

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1: Update the component**

Replace the return statement (around line 135) with the new layout:

```typescript
return (
  <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
    {/* Scrollable body with all content */}
    <div className="flex-1 overflow-y-auto p-4">
      {/* Title row with checkbox */}
      <div className="flex items-start gap-3 mb-3">
        {isTask ? (
          <button
            type="button"
            onClick={handleToggleComplete}
            className={`w-5 h-5 mt-1 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              isCompleted
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-400 dark:border-gray-500 hover:border-blue-500'
            }`}
          >
            {isCompleted && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <div className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}

        <textarea
          ref={titleRef}
          value={localItem.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          rows={1}
          className={`flex-1 text-xl font-semibold bg-transparent border-none outline-none resize-none ${
            isCompleted
              ? 'text-gray-400 dark:text-gray-500 line-through'
              : 'text-gray-900 dark:text-white'
          }`}
          placeholder={isTask ? "Task title" : "Note title"}
        />
      </div>

      {/* Metadata row: due date + more menu */}
      <div className="flex items-center gap-2 mb-4 ml-8">
        {isTask && (
          <DueDatePicker
            dueDate={due ? new Date(due) : null}
            repeat={repeat ?? null}
            onDateChange={(date) => handleDueChange(date?.toISOString() || '')}
            onRepeatChange={handleRepeatChange}
          />
        )}

        {/* More Options dropdown */}
        <div ref={moreMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
            title="More options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {showMoreMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <button
                onClick={handleConvert}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isTask ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Convert to Note
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    Convert to Task
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  handleDelete()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="ml-8">
        <RichTextEditor
          content={localItem.content}
          onChange={handleContentChange}
          placeholder="Add description..."
          className="min-h-[200px]"
        />

        {isTask && <SubtaskList parentId={localItem.id} />}
      </div>
    </div>
    {dialogProps && <ConfirmDialog {...dialogProps} />}
  </div>
)
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/components/layout/TaskDetail.tsx
git commit -m "feat: move TaskDetail header content inline with body"
```

---

## Task 9: Update App.tsx to use new layout system

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Update imports**

```typescript
import { useEffect, useState } from 'react'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider, useUI } from './contexts/UIContext'
import { TreeDndProvider } from './contexts/TreeDndContext'
import { HistoryProvider } from './contexts/HistoryContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Welcome } from './components/Welcome'
import { TitleBar } from './components/layout/TitleBar'
import { ResizablePanelLayout } from './components/layout/ResizablePanelLayout'
import { QuickAddModal } from './components/ui/QuickAddModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { AppSettings } from '@shared/types'
```

**Step 2: Simplify MainLayout**

```typescript
function MainLayout() {
  const { showQuickAdd, quickAddType, closeQuickAdd } = useUI()
  useKeyboardShortcuts()

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <TitleBar />
      <TreeDndProvider>
        <div className="flex-1 flex min-h-0">
          <ResizablePanelLayout />
        </div>
      </TreeDndProvider>
      {showQuickAdd && (
        <QuickAddModal type={quickAddType} onClose={closeQuickAdd} />
      )}
    </div>
  )
}
```

**Step 3: Update AppContent to use MainLayout directly**

```typescript
function AppContent() {
  const { vaultPath, loadVault, loading } = useVault()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const settings: AppSettings = await window.api.getSettings()
      if (settings.vaultPath) {
        await loadVault(settings.vaultPath)
      }
      setInitialized(true)
    }
    init()
  }, [loadVault])

  if (!initialized || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!vaultPath) {
    return <Welcome />
  }

  return (
    <HistoryProvider>
      <MainLayout />
    </HistoryProvider>
  )
}
```

**Step 4: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: integrate ResizablePanelLayout in App"
```

---

## Task 10: Update Sidebar for draggable resize

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

The Sidebar currently handles its own collapsed state display. With react-resizable-panels, the Panel component controls width. We need to:

1. Remove the fixed width classes from Sidebar
2. Let it fill its container
3. Keep the collapsed/expanded content rendering based on `sidebarCollapsed`

**Step 1: Update Sidebar container divs**

Change the root div from having explicit width to filling container:

In the collapsed view (around line 543):
```typescript
// Change from:
<div className="h-full flex flex-col bg-white dark:bg-gray-900 py-4">
// No change needed - it will fill the Panel container
```

In the expanded view (around line 666):
```typescript
// Change from:
<div className="h-full flex flex-col bg-white dark:bg-gray-900">
// No change needed - it will fill the Panel container
```

The Sidebar already fills its container, so minimal changes needed.

**Step 2: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "refactor: ensure Sidebar fills resizable panel container"
```

---

## Task 11: Run full test suite and fix any issues

**Step 1: Run all tests**

Run: `npm test`

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Run lint**

Run: `npm run lint`

**Step 4: Fix any issues found**

Address any failing tests or type errors.

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve test and type errors from responsive layout changes"
```

---

## Task 12: Manual testing checklist

**Step 1: Start the app**

Run: `npm run electron:dev`

**Step 2: Test responsive breakpoints**

- [ ] At 900px+ width: sidebar + task list + task detail visible
- [ ] At 640-899px width: sidebar hidden, task list + task detail visible
- [ ] At <640px width: single panel view
- [ ] Window can resize down to 320px without layout breaking

**Step 3: Test resizable panels**

- [ ] Drag handle between task list and task detail works
- [ ] Drag handle respects 320px minimum
- [ ] Sidebar drag handle works (full mode only)
- [ ] Dragging sidebar below 180px snaps to collapsed

**Step 4: Test focus mode**

- [ ] Focus mode button appears when task selected (non-mobile)
- [ ] Clicking expands task detail to full width
- [ ] Clicking again returns to normal layout

**Step 5: Test mobile navigation**

- [ ] In mobile mode, selecting task shows detail
- [ ] Back button returns to list
- [ ] Forward button works after going back

**Step 6: Test task detail layout**

- [ ] Checkbox is inline with title
- [ ] Due date and more menu are below title
- [ ] Content scrolls properly

**Step 7: Commit any final fixes**

```bash
git add -A
git commit -m "fix: address issues found in manual testing"
```

---

## Summary

| Task | Description |
|------|-------------|
| 0 | Lower app min width for responsive modes |
| 1 | Install react-resizable-panels |
| 2 | Create useLayoutMode hook |
| 3 | Add navigation history to UIContext |
| 4 | Create useLayoutPersistence hook |
| 5 | Update UIContext with layoutMode + focusMode |
| 6 | Create ResizablePanelLayout component |
| 7 | Update TitleBar for mobile nav |
| 8 | Update TaskDetail layout |
| 9 | Update App.tsx |
| 10 | Update Sidebar for resize |
| 11 | Run full test suite |
| 12 | Manual testing |
