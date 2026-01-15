import { useCallback } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { useUI } from '../../contexts/UIContext'
import { useLayoutPersistence } from '../../hooks/useLayoutPersistence'
import { useWindowFocus } from '../../hooks/useWindowFocus'
import { Sidebar } from './Sidebar'
import { TaskList } from './TaskList'
import { TaskDetail } from './TaskDetail'
import { NoteDetail } from './NoteDetail'
import { useVault } from '../../contexts/VaultContext'
import type { VaultNote } from '@shared/types'
import { Menu, X } from 'lucide-react'

const SIDEBAR_COLLAPSED_PX = 78
const SIDEBAR_EXPANDED_PX = 256
const MAIN_PANEL_MIN_PX = 320
const TASK_LIST_MAX_PX = 600
const MOBILE_NAV_HEIGHT_PX = 40

export function ResizablePanelLayout() {
  const { selectedTaskId, layoutMode, focusMode, sidebarCollapsed, mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUI()
  const { items } = useVault()
  const { sizes, setSizes } = useLayoutPersistence()
  const windowFocused = useWindowFocus()

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null
  const isNote = selectedItem?.meta.type === 'note'

  const handleMainLayoutChange = useCallback((layout: Record<string, number>) => {
    if (!layout.taskList || !layout.taskDetail) return
    setSizes({ taskListPercent: layout.taskList, taskDetailPercent: layout.taskDetail })
  }, [setSizes])

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

  if (layoutMode === 'mobile') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile top nav bar - includes drag region for window */}
        <div
          className="flex-shrink-0 relative flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          style={{ height: MOBILE_NAV_HEIGHT_PX, paddingLeft: 72, WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {/* Placeholder traffic lights when window is unfocused */}
          {!windowFocused && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
              <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
              <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
          )}
          <button
            onClick={toggleMobileMenu}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Mobile sidebar overlay with slide animation */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ top: MOBILE_NAV_HEIGHT_PX }}
          onClick={closeMobileMenu}
        />
        <div
          className={`fixed left-0 bottom-0 z-50 bg-white dark:bg-gray-900 shadow-xl transition-transform duration-200 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ top: MOBILE_NAV_HEIGHT_PX, width: SIDEBAR_EXPANDED_PX }}
        >
          <Sidebar onNavigate={closeMobileMenu} />
        </div>

        {/* Mobile content */}
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

  if (layoutMode === 'compact') {
    return (
      <div className="flex-1 flex min-h-0">
        {/* Always show collapsed sidebar in compact mode */}
        <div
          className="border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
          style={{ width: SIDEBAR_COLLAPSED_PX }}
        >
          <Sidebar forceCollapsed />
        </div>
        <Group className="flex-1 w-full h-full min-h-0" orientation="horizontal" onLayoutChanged={handleMainLayoutChange}>
          <Panel
            id="taskList"
            defaultSize={selectedTaskId ? `${sizes.taskListPercent}%` : '100%'}
            minSize={MAIN_PANEL_MIN_PX}
            maxSize={selectedTaskId ? TASK_LIST_MAX_PX : undefined}
          >
            <TaskList />
          </Panel>
          {selectedTaskId && (
            <>
              <Separator
                className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize outline-none"
              />
              <Panel
                id="taskDetail"
                key={selectedTaskId}
                defaultSize={`${sizes.taskDetailPercent}%`}
                minSize={MAIN_PANEL_MIN_PX}
              >
                {isNote ? (
                  <NoteDetail note={selectedItem as VaultNote} />
                ) : (
                  <TaskDetail />
                )}
              </Panel>
            </>
          )}
        </Group>
      </div>
    )
  }

  return (
    <div className="flex-1 flex min-h-0">
      <div
        className={`border-r border-gray-200 dark:border-gray-700 flex-shrink-0 ${
          sidebarCollapsed ? 'w-14' : 'w-64'
        }`}
        style={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX }}
      >
        <Sidebar />
      </div>
      <Group className="flex-1 w-full h-full min-h-0" orientation="horizontal" onLayoutChanged={handleMainLayoutChange}>
        <Panel
          id="taskList"
          defaultSize={selectedTaskId ? `${sizes.taskListPercent}%` : '100%'}
          minSize={MAIN_PANEL_MIN_PX}
          maxSize={selectedTaskId ? TASK_LIST_MAX_PX : undefined}
        >
          <TaskList />
        </Panel>
        {selectedTaskId && (
          <>
            <Separator
              className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
            />
            <Panel
              id="taskDetail"
              key={selectedTaskId}
              defaultSize={`${sizes.taskDetailPercent}%`}
              minSize={MAIN_PANEL_MIN_PX}
            >
              {isNote ? (
                <NoteDetail note={selectedItem as VaultNote} />
              ) : (
                <TaskDetail />
              )}
            </Panel>
          </>
        )}
      </Group>
    </div>
  )
}
