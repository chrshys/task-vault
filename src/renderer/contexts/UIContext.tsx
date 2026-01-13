import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ViewType } from '@shared/types'
import { useWindowSize } from '../hooks/useWindowSize'

const SIDEBAR_COLLAPSE_BREAKPOINT = 1024
const COLLAPSED_SECTIONS_KEY = 'sidebar-sections-collapsed'

function loadCollapsedSections(vaultPath: string | null): Set<string> {
  if (!vaultPath) return new Set()
  try {
    const data = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
    if (!data) return new Set()
    const parsed = JSON.parse(data)
    return new Set(parsed[vaultPath] || [])
  } catch {
    return new Set()
  }
}

function saveCollapsedSections(vaultPath: string | null, collapsed: Set<string>) {
  if (!vaultPath) return
  try {
    const data = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
    const parsed = data ? JSON.parse(data) : {}
    parsed[vaultPath] = Array.from(collapsed)
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage errors
  }
}

interface UIContextValue {
  selectedView: ViewType
  selectedPath: string | null
  selectedTaskId: string | null
  sidebarCollapsed: boolean
  sidebarManuallyCollapsed: boolean
  windowWidth: number
  showQuickAdd: boolean
  quickAddType: 'task' | 'note'
  collapsedSections: Set<string>
  setSelectedView: (view: ViewType, path?: string) => void
  setSelectedTaskId: (id: string | null) => void
  toggleSidebar: () => void
  toggleSectionCollapse: (sectionName: string) => void
  isSectionCollapsed: (sectionName: string) => boolean
  openQuickAdd: (type: 'task' | 'note') => void
  closeQuickAdd: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children, vaultPath = null }: { children: ReactNode, vaultPath?: string | null }) {
  const [selectedView, setSelectedViewState] = useState<ViewType>('inbox')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sidebarManuallyCollapsed, setSidebarManuallyCollapsed] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'task' | 'note'>('task')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const { width: windowWidth } = useWindowSize()
  const sidebarCollapsed = sidebarManuallyCollapsed || windowWidth < SIDEBAR_COLLAPSE_BREAKPOINT

  // Load collapsed sections when vault changes
  useEffect(() => {
    setCollapsedSections(loadCollapsedSections(vaultPath))
  }, [vaultPath])

  // Save collapsed sections when they change
  useEffect(() => {
    saveCollapsedSections(vaultPath, collapsedSections)
  }, [vaultPath, collapsedSections])

  const setSelectedView = useCallback((view: ViewType, path?: string) => {
    setSelectedViewState(view)
    setSelectedPath(path || null)
    setSelectedTaskId(null)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarManuallyCollapsed(prev => !prev)
  }, [])

  const toggleSectionCollapse = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionName)) {
        next.delete(sectionName)
      } else {
        next.add(sectionName)
      }
      return next
    })
  }, [])

  const isSectionCollapsed = useCallback((sectionName: string) => {
    return collapsedSections.has(sectionName)
  }, [collapsedSections])

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
        collapsedSections,
        setSelectedView,
        setSelectedTaskId,
        toggleSidebar,
        toggleSectionCollapse,
        isSectionCollapsed,
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
