import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ViewType } from '@shared/types'
import { useWindowSize } from '../hooks/useWindowSize'

const SIDEBAR_COLLAPSE_BREAKPOINT = 1024

interface UIContextValue {
  selectedView: ViewType
  selectedPath: string | null
  selectedTaskId: string | null
  sidebarCollapsed: boolean
  sidebarManuallyCollapsed: boolean
  windowWidth: number
  showQuickAdd: boolean
  quickAddType: 'task' | 'note'
  setSelectedView: (view: ViewType, path?: string) => void
  setSelectedTaskId: (id: string | null) => void
  toggleSidebar: () => void
  openQuickAdd: (type: 'task' | 'note') => void
  closeQuickAdd: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedView, setSelectedViewState] = useState<ViewType>('inbox')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sidebarManuallyCollapsed, setSidebarManuallyCollapsed] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'task' | 'note'>('task')

  const { width: windowWidth } = useWindowSize()
  const sidebarCollapsed = sidebarManuallyCollapsed || windowWidth < SIDEBAR_COLLAPSE_BREAKPOINT

  const setSelectedView = useCallback((view: ViewType, path?: string) => {
    setSelectedViewState(view)
    setSelectedPath(path || null)
    setSelectedTaskId(null)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarManuallyCollapsed(prev => !prev)
  }, [])

  const openQuickAdd = useCallback((type: 'task' | 'note') => {
    setQuickAddType(type)
    setShowQuickAdd(true)
  }, [])

  const closeQuickAdd = useCallback(() => {
    setShowQuickAdd(false)
  }, [])

  return (
    <UIContext.Provider
      value={{
        selectedView,
        selectedPath,
        selectedTaskId,
        sidebarCollapsed,
        sidebarManuallyCollapsed,
        windowWidth,
        showQuickAdd,
        quickAddType,
        setSelectedView,
        setSelectedTaskId,
        toggleSidebar,
        openQuickAdd,
        closeQuickAdd,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
