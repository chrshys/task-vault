import { useUI } from '../../contexts/UIContext'

const SIDEBAR_COLLAPSED_PX = 78
const SIDEBAR_EXPANDED_PX = 256

export function TitleBar() {
  const { sidebarCollapsed, layoutMode } = useUI()

  const sidebarWidth = layoutMode === 'compact'
    ? SIDEBAR_COLLAPSED_PX
    : (sidebarCollapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX)

  return (
    <div
      className="h-10 flex shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Dark section matching sidebar */}
      <div
        className="h-full bg-gray-100 dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-700 shrink-0"
        style={{ width: sidebarWidth }}
      />
      {/* Light section for main content */}
      <div className="h-full flex-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />
    </div>
  )
}
