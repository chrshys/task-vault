import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ViewType } from '@shared/types'

interface UIContextValue {
  selectedView: ViewType
  selectedPath: string | null
  selectedTaskId: string | null
  sidebarCollapsed: boolean
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'task' | 'note'>('task')

  const setSelectedView = useCallback((view: ViewType, path?: string) => {
    setSelectedViewState(view)
    setSelectedPath(path || null)
    setSelectedTaskId(null)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
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
