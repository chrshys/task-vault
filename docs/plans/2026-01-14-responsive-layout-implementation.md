# Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add resizable panels, responsive breakpoints, and mobile navigation to Task Vault.

**Architecture:** Use `react-resizable-panels` for drag-to-resize. Create a `useLayoutMode` hook to determine layout (full/compact/mobile) based on window width. Add navigation history for back/forward in mobile mode. Move task detail header content inline with body.

**Tech Stack:** React, TypeScript, react-resizable-panels, Tailwind CSS, Vitest

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

## Task 3: Create NavigationContext for back/forward

**Files:**
- Create: `src/renderer/contexts/NavigationContext.tsx`
- Test: `src/renderer/contexts/NavigationContext.test.tsx`

**Step 1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { NavigationProvider, useNavigation } from './NavigationContext'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <NavigationProvider>{children}</NavigationProvider>
)

describe('NavigationContext', () => {
  it('starts with no history', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper })
    expect(result.current.canGoBack).toBe(false)
    expect(result.current.canGoForward).toBe(false)
  })

  it('can navigate and go back', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper })

    act(() => {
      result.current.navigate({ view: 'inbox', path: null, taskId: null })
    })
    act(() => {
      result.current.navigate({ view: 'project', path: '/test', taskId: null })
    })

    expect(result.current.canGoBack).toBe(true)

    act(() => {
      result.current.goBack()
    })

    expect(result.current.current).toEqual({ view: 'inbox', path: null, taskId: null })
    expect(result.current.canGoForward).toBe(true)
  })

  it('can go forward after going back', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper })

    act(() => {
      result.current.navigate({ view: 'inbox', path: null, taskId: null })
    })
    act(() => {
      result.current.navigate({ view: 'project', path: '/test', taskId: null })
    })
    act(() => {
      result.current.goBack()
    })
    act(() => {
      result.current.goForward()
    })

    expect(result.current.current).toEqual({ view: 'project', path: '/test', taskId: null })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/renderer/contexts/NavigationContext.test.tsx`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ViewType } from '@shared/types'

interface NavigationState {
  view: ViewType
  path: string | null
  taskId: string | null
}

interface NavigationContextValue {
  current: NavigationState | null
  canGoBack: boolean
  canGoForward: boolean
  navigate: (state: NavigationState) => void
  goBack: () => void
  goForward: () => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<NavigationState[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const current = currentIndex >= 0 ? history[currentIndex] : null
  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < history.length - 1

  const navigate = useCallback((state: NavigationState) => {
    setHistory(prev => {
      // Truncate forward history when navigating
      const newHistory = prev.slice(0, currentIndex + 1)
      return [...newHistory, state]
    })
    setCurrentIndex(prev => prev + 1)
  }, [currentIndex])

  const goBack = useCallback(() => {
    if (canGoBack) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [canGoBack])

  const goForward = useCallback(() => {
    if (canGoForward) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [canGoForward])

  return (
    <NavigationContext.Provider
      value={{
        current,
        canGoBack,
        canGoForward,
        navigate,
        goBack,
        goForward,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/renderer/contexts/NavigationContext.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/contexts/NavigationContext.tsx src/renderer/contexts/NavigationContext.test.tsx
git commit -m "feat: add NavigationContext for back/forward history"
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
      sidebar: 256,
      taskList: 40,
      taskDetail: 60,
    })
  })

  it('persists sizes to localStorage', () => {
    const { result } = renderHook(() => useLayoutPersistence())

    act(() => {
      result.current.setSizes({ sidebar: 300, taskList: 50, taskDetail: 50 })
    })

    const stored = JSON.parse(localStorage.getItem('panel-sizes') || '{}')
    expect(stored.sidebar).toBe(300)
  })

  it('restores sizes from localStorage', () => {
    localStorage.setItem('panel-sizes', JSON.stringify({
      sidebar: 200,
      taskList: 45,
      taskDetail: 55,
    }))

    const { result } = renderHook(() => useLayoutPersistence())
    expect(result.current.sizes.sidebar).toBe(200)
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
  sidebar: number      // pixels
  taskList: number     // percentage of remaining space
  taskDetail: number   // percentage of remaining space
}

const DEFAULT_SIZES: PanelSizes = {
  sidebar: 256,
  taskList: 40,
  taskDetail: 60,
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

  const setSizes = useCallback((newSizes: PanelSizes) => {
    setSizesState(newSizes)
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

## Task 5: Update UIContext with focusMode and layoutMode

**Files:**
- Modify: `src/renderer/contexts/UIContext.tsx:32-49` (interface)
- Modify: `src/renderer/contexts/UIContext.tsx:53-134` (provider)

**Step 1: Update the UIContextValue interface**

Add to the interface around line 32:

```typescript
interface UIContextValue {
  selectedView: ViewType
  selectedPath: string | null
  selectedTaskId: string | null
  sidebarCollapsed: boolean
  sidebarManuallyCollapsed: boolean
  sidebarWidth: number
  windowWidth: number
  layoutMode: LayoutMode
  focusMode: boolean
  showQuickAdd: boolean
  quickAddType: 'task' | 'note'
  collapsedSections: Set<string>
  setSelectedView: (view: ViewType, path?: string) => void
  setSelectedTaskId: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
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

Add state and handlers in the provider:

```typescript
const [focusMode, setFocusMode] = useState(false)
const [sidebarWidth, setSidebarWidthState] = useState(256)

const layoutMode = useLayoutMode()

// Auto-exit focus mode when entering mobile layout
useEffect(() => {
  if (layoutMode === 'mobile') {
    setFocusMode(false)
  }
}, [layoutMode])

const setSidebarWidth = useCallback((width: number) => {
  setSidebarWidthState(width)
}, [])

const toggleFocusMode = useCallback(() => {
  setFocusMode(prev => !prev)
}, [])
```

**Step 4: Update the Provider value**

Add the new values to the Provider:

```typescript
value={{
  // ... existing values
  sidebarWidth,
  layoutMode,
  focusMode,
  setSidebarWidth,
  toggleFocusMode,
}}
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: May have errors from components not yet updated - that's OK

**Step 6: Commit**

```bash
git add src/renderer/contexts/UIContext.tsx
git commit -m "feat: add focusMode, layoutMode, and sidebarWidth to UIContext"
```

---

## Task 6: Create ResizablePanelLayout component

**Files:**
- Create: `src/renderer/components/layout/ResizablePanelLayout.tsx`

**Step 1: Create the component**

```typescript
import { useCallback, useRef, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels'
import { useUI } from '../../contexts/UIContext'
import { useLayoutPersistence } from '../../hooks/useLayoutPersistence'
import { Sidebar } from './Sidebar'
import { TaskList } from './TaskList'
import { TaskDetail } from './TaskDetail'
import { NoteDetail } from './NoteDetail'
import { useVault } from '../../contexts/VaultContext'
import type { VaultNote } from '@shared/types'

const SIDEBAR_MIN_SIZE_PX = 180
const SIDEBAR_COLLAPSED_SIZE_PX = 56
const PANEL_MIN_SIZE_PERCENT = 20 // ~320px at common widths

export function ResizablePanelLayout() {
  const { selectedTaskId, layoutMode, focusMode, sidebarCollapsed, sidebarWidth, setSidebarWidth } = useUI()
  const { items } = useVault()
  const { sizes, setSizes } = useLayoutPersistence()
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null
  const isNote = selectedItem?.meta.type === 'note'

  // Handle sidebar collapse via drag
  const handleSidebarResize = useCallback((size: number) => {
    // Size is in percentage, convert to approximate pixels
    const pixelWidth = (size / 100) * window.innerWidth

    if (pixelWidth < SIDEBAR_MIN_SIZE_PX && pixelWidth > SIDEBAR_COLLAPSED_SIZE_PX) {
      // Snap to collapsed
      sidebarPanelRef.current?.collapse()
    } else {
      setSidebarWidth(pixelWidth)
    }
  }, [setSidebarWidth])

  const handleMainPanelResize = useCallback((sizes: number[]) => {
    setSizes({
      ...sizes,
      taskList: sizes[0],
      taskDetail: sizes[1],
    } as any)
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
        <Panel defaultSize={sizes.taskList} minSize={PANEL_MIN_SIZE_PERCENT}>
          <TaskList />
        </Panel>
        {selectedTaskId && (
          <>
            <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize" />
            <Panel defaultSize={sizes.taskDetail} minSize={PANEL_MIN_SIZE_PERCENT}>
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
  const sidebarPercent = (sidebarWidth / window.innerWidth) * 100
  const collapsedPercent = (SIDEBAR_COLLAPSED_SIZE_PX / window.innerWidth) * 100

  return (
    <PanelGroup direction="horizontal">
      <Panel
        ref={sidebarPanelRef}
        defaultSize={sidebarCollapsed ? collapsedPercent : sidebarPercent}
        minSize={collapsedPercent}
        maxSize={25}
        collapsible
        collapsedSize={collapsedPercent}
        onResize={handleSidebarResize}
      >
        <Sidebar />
      </Panel>
      <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize" />
      <Panel minSize={PANEL_MIN_SIZE_PERCENT}>
        <PanelGroup direction="horizontal" onLayout={handleMainPanelResize}>
          <Panel defaultSize={selectedTaskId ? sizes.taskList : 100} minSize={PANEL_MIN_SIZE_PERCENT}>
            <TaskList />
          </Panel>
          {selectedTaskId && (
            <>
              <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize" />
              <Panel defaultSize={sizes.taskDetail} minSize={PANEL_MIN_SIZE_PERCENT}>
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
import { useNavigation } from '../../contexts/NavigationContext'

export function TitleBar() {
  const { sidebarCollapsed, toggleSidebar, layoutMode, focusMode, toggleFocusMode, selectedTaskId } = useUI()
  const { canGoBack, canGoForward, goBack, goForward } = useNavigation()

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
import { NavigationProvider } from './contexts/NavigationContext'
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

**Step 3: Update AppContent to include NavigationProvider**

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
      <NavigationProvider>
        <MainLayout />
      </NavigationProvider>
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
git commit -m "feat: integrate ResizablePanelLayout and NavigationProvider in App"
```

---

## Task 10: Wire up navigation history

**Files:**
- Modify: `src/renderer/contexts/UIContext.tsx`

**Step 1: Import useNavigation hook**

At top of file, add:

```typescript
import { useNavigation } from './NavigationContext'
```

Note: This creates a circular dependency issue. We need to refactor slightly.

**Alternative approach - use a callback pattern:**

Instead, we'll have the App component wire up navigation. Modify `setSelectedView` and `setSelectedTaskId` to also push to navigation history.

**Step 2: Create a wrapper hook in App.tsx**

Add a new component that syncs UI state with navigation:

```typescript
function NavigationSync() {
  const { selectedView, selectedPath, selectedTaskId, setSelectedView, setSelectedTaskId } = useUI()
  const { navigate, current, goBack, goForward, canGoBack, canGoForward } = useNavigation()

  // Push to history when selection changes
  useEffect(() => {
    const newState = { view: selectedView, path: selectedPath, taskId: selectedTaskId }
    // Only push if different from current
    if (!current ||
        current.view !== newState.view ||
        current.path !== newState.path ||
        current.taskId !== newState.taskId) {
      navigate(newState)
    }
  }, [selectedView, selectedPath, selectedTaskId])

  // Sync UI when navigating back/forward
  useEffect(() => {
    if (current) {
      // Use internal setters to avoid re-pushing to history
      // This requires exposing internal setters - see next step
    }
  }, [current])

  return null
}
```

This is getting complex. Let's simplify by handling navigation directly in UIContext.

**Step 3: Refactor UIContext to handle its own navigation history**

Update UIContext to include navigation state internally:

```typescript
// Add to UIContext state
const [navHistory, setNavHistory] = useState<Array<{view: ViewType, path: string | null, taskId: string | null}>>([])
const [navIndex, setNavIndex] = useState(-1)

const canGoBack = navIndex > 0
const canGoForward = navIndex < navHistory.length - 1

const setSelectedView = useCallback((view: ViewType, path?: string) => {
  setSelectedViewState(view)
  setSelectedPath(path || null)
  setSelectedTaskId(null)

  // Push to navigation history
  const newState = { view, path: path || null, taskId: null }
  setNavHistory(prev => [...prev.slice(0, navIndex + 1), newState])
  setNavIndex(prev => prev + 1)
}, [navIndex])

const setSelectedTaskIdWithNav = useCallback((id: string | null) => {
  setSelectedTaskId(id)

  // Push to navigation history
  const newState = { view: selectedView, path: selectedPath, taskId: id }
  setNavHistory(prev => [...prev.slice(0, navIndex + 1), newState])
  setNavIndex(prev => prev + 1)
}, [navIndex, selectedView, selectedPath])

const goBack = useCallback(() => {
  if (!canGoBack) return
  const prev = navHistory[navIndex - 1]
  setNavIndex(navIndex - 1)
  setSelectedViewState(prev.view)
  setSelectedPath(prev.path)
  setSelectedTaskId(prev.taskId)
}, [canGoBack, navHistory, navIndex])

const goForward = useCallback(() => {
  if (!canGoForward) return
  const next = navHistory[navIndex + 1]
  setNavIndex(navIndex + 1)
  setSelectedViewState(next.view)
  setSelectedPath(next.path)
  setSelectedTaskId(next.taskId)
}, [canGoForward, navHistory, navIndex])
```

**Step 4: Add to provider value**

```typescript
value={{
  // ... existing
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  setSelectedTaskId: setSelectedTaskIdWithNav,
}}
```

**Step 5: Update TitleBar to use UIContext instead of NavigationContext**

```typescript
const { canGoBack, canGoForward, goBack, goForward, /* other values */ } = useUI()
```

**Step 6: Remove NavigationContext import from App.tsx and TitleBar**

Since navigation is now in UIContext, we don't need the separate NavigationProvider.

**Step 7: Run tests**

Run: `npm test`
Expected: PASS

**Step 8: Commit**

```bash
git add src/renderer/contexts/UIContext.tsx src/renderer/components/layout/TitleBar.tsx src/renderer/App.tsx
git commit -m "feat: integrate navigation history into UIContext"
```

---

## Task 11: Update Sidebar for draggable resize

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

## Task 12: Run full test suite and fix any issues

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

## Task 13: Manual testing checklist

**Step 1: Start the app**

Run: `npm run electron:dev`

**Step 2: Test responsive breakpoints**

- [ ] At 900px+ width: sidebar + task list + task detail visible
- [ ] At 640-899px width: sidebar hidden, task list + task detail visible
- [ ] At <640px width: single panel view

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
| 1 | Install react-resizable-panels |
| 2 | Create useLayoutMode hook |
| 3 | Create NavigationContext |
| 4 | Create useLayoutPersistence hook |
| 5 | Update UIContext with new state |
| 6 | Create ResizablePanelLayout component |
| 7 | Update TitleBar for mobile nav |
| 8 | Update TaskDetail layout |
| 9 | Update App.tsx |
| 10 | Wire up navigation history |
| 11 | Update Sidebar for resize |
| 12 | Run full test suite |
| 13 | Manual testing |
