import { useCallback } from 'react'
import { Group, Panel, Separator, usePanelRef, type PanelSize } from 'react-resizable-panels'
import { useUI } from '../../contexts/UIContext'
import { useLayoutPersistence } from '../../hooks/useLayoutPersistence'
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
  const sidebarPanelRef = usePanelRef()

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null
  const isNote = selectedItem?.meta.type === 'note'

  const sidebarWidthPx = sidebarCollapsed ? SIDEBAR_COLLAPSED_PX : sizes.sidebarPx

  const handleSidebarResize = useCallback((size: PanelSize) => {
    const pixelWidth = size.inPixels
    if (pixelWidth < SIDEBAR_MIN_PX && pixelWidth > SIDEBAR_COLLAPSED_PX) {
      sidebarPanelRef.current?.collapse()
      return
    }
    const clamped = Math.min(Math.max(pixelWidth, SIDEBAR_MIN_PX), SIDEBAR_MAX_PX)
    setSizes({ sidebarPx: clamped })
  }, [setSizes, sidebarPanelRef])

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

  if (layoutMode === 'compact') {
    return (
      <Group className="flex-1 w-full h-full min-h-0" orientation="horizontal" onLayoutChanged={handleMainLayoutChange}>
        <Panel
          id="taskList"
          defaultSize={selectedTaskId ? `${sizes.taskListPercent}%` : '100%'}
          minSize={MAIN_PANEL_MIN_PX}
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
    )
  }

  return (
    <Group className="flex-1 w-full h-full min-h-0" orientation="horizontal">
      <Panel
        id="sidebar"
        panelRef={sidebarPanelRef}
        defaultSize={sidebarWidthPx}
        minSize={SIDEBAR_COLLAPSED_PX}
        maxSize={SIDEBAR_MAX_PX}
        collapsible
        collapsedSize={SIDEBAR_COLLAPSED_PX}
        onResize={handleSidebarResize}
      >
        <Sidebar />
      </Panel>
      <Separator
        className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
      />
      <Panel id="main" minSize={MAIN_PANEL_MIN_PX}>
        <Group className="w-full h-full min-h-0" orientation="horizontal" onLayoutChanged={handleMainLayoutChange}>
          <Panel
            id="taskList"
            defaultSize={selectedTaskId ? `${sizes.taskListPercent}%` : '100%'}
            minSize={MAIN_PANEL_MIN_PX}
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
      </Panel>
    </Group>
  )
}
