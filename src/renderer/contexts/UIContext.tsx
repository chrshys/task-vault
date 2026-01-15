import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { ViewType } from '@shared/types'
import { useWindowSize } from '../hooks/useWindowSize'
import { useLayoutMode, type LayoutMode } from '../hooks/useLayoutMode'

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
  layoutMode: LayoutMode
  focusMode: boolean
  showQuickAdd: boolean
  quickAddType: 'task' | 'note'
  collapsedSections: Set<string>
  mobileMenuOpen: boolean
  setSelectedView: (view: ViewType, path?: string) => void
  setSelectedTaskId: (id: string | null) => void
  toggleSidebar: () => void
  toggleFocusMode: () => void
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
  toggleSectionCollapse: (sectionName: string) => void
  isSectionCollapsed: (sectionName: string) => boolean
  openQuickAdd: (type: 'task' | 'note') => void
  closeQuickAdd: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

type NavigationState = { view: ViewType, path: string | null, taskId: string | null }

export function UIProvider({ children, vaultPath = null }: { children: ReactNode, vaultPath?: string | null }) {
  const [selectedView, setSelectedViewState] = useState<ViewType>('inbox')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sidebarManuallyCollapsed, setSidebarManuallyCollapsed] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'task' | 'note'>('task')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [navHistory, setNavHistory] = useState<NavigationState[]>([])
  const [navIndex, setNavIndex] = useState(-1)
  const suppressNavRef = useRef(false)
  const [focusMode, setFocusMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { width: windowWidth } = useWindowSize()
  const sidebarCollapsed = sidebarManuallyCollapsed
  const layoutMode = useLayoutMode()

  // Load collapsed sections when vault changes
  useEffect(() => {
    setCollapsedSections(loadCollapsedSections(vaultPath))
  }, [vaultPath])

  // Save collapsed sections when they change
  useEffect(() => {
    saveCollapsedSections(vaultPath, collapsedSections)
  }, [vaultPath, collapsedSections])

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

  const toggleSidebar = useCallback(() => {
    setSidebarManuallyCollapsed(prev => !prev)
  }, [])

  useEffect(() => {
    if (layoutMode === 'mobile') {
      setFocusMode(false)
    } else {
      setMobileMenuOpen(false)
    }
  }, [layoutMode])

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => !prev)
  }, [])

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
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
        layoutMode,
        focusMode,
        showQuickAdd,
        quickAddType,
        collapsedSections,
        mobileMenuOpen,
        setSelectedView,
        setSelectedTaskId: setSelectedTaskIdWithNav,
        toggleSidebar,
        toggleFocusMode,
        toggleMobileMenu,
        closeMobileMenu,
        canGoBack,
        canGoForward,
        goBack,
        goForward,
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
