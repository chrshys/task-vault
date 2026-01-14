import { useCallback, useMemo, useRef } from 'react'
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
    )
  }

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
