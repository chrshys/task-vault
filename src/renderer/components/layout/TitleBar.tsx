import { useUI } from '../../contexts/UIContext'

export function TitleBar() {
  const { sidebarCollapsed, toggleSidebar } = useUI()

  return (
    <div
      className="h-10 bg-white dark:bg-gray-900 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 shrink-0 px-4"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Traffic light spacer and sidebar toggle on left */}
      <div className="flex items-center gap-2">
        <div className="w-16" />
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
      </div>

      {/* Spacer for centering */}
      <div className="w-20" />
    </div>
  )
}
