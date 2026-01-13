import { useHistory } from '../../contexts/HistoryContext'
import { useVault } from '../../contexts/VaultContext'

export function TitleBar() {
  const { canUndo, canRedo, undo, redo } = useHistory()
  const { updateItem } = useVault()

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
      {/* Traffic light spacer on left */}
      <div className="w-20" />

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
