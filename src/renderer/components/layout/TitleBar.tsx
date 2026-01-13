import { useHistory } from '../../contexts/HistoryContext'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'

export function TitleBar() {
  const { canUndo, canRedo, undo, redo } = useHistory()
  const { updateItem } = useVault()
  const { sidebarCollapsed, toggleSidebar } = useUI()

  const handleUndo = async () => {
    const action = undo()
    if (!action) return
    if (action.before) {
      await updateItem(action.before)
    }
  }

  const handleRedo = async () => {
    const action = redo()
    if (!action) return
    if (action.after) {
      await updateItem(action.after)
    }
  }

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

      <div
        className="flex gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`px-2 py-1 text-xs rounded ${
            canUndo
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
          title="Undo (Cmd+Z)"
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={`px-2 py-1 text-xs rounded ${
            canRedo
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
          title="Redo (Cmd+Shift+Z)"
        >
          Redo
        </button>
      </div>

      <div className="w-20" />
    </div>
  )
}
