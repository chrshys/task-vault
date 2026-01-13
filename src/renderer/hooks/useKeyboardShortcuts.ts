import { useEffect } from 'react'
import { useHistory } from '../contexts/HistoryContext'
import { useVault } from '../contexts/VaultContext'
import { useUI } from '../contexts/UIContext'

export function useKeyboardShortcuts() {
  const { canUndo, canRedo, undo, redo } = useHistory()
  const { updateItem } = useVault()
  const { openQuickAdd } = useUI()

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (!modifier) return

      // Cmd/Ctrl+Z for undo
      if (e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault()
        const action = undo()
        if (action?.before) {
          await updateItem(action.before)
        }
      }

      // Cmd/Ctrl+Shift+Z for redo
      if (e.key === 'z' && e.shiftKey && canRedo) {
        e.preventDefault()
        const action = redo()
        if (action?.after) {
          await updateItem(action.after)
        }
      }

      // Cmd/Ctrl+N for new task
      if (e.key === 'n' && modifier && !e.shiftKey) {
        e.preventDefault()
        openQuickAdd('task')
      }

      // Cmd/Ctrl+Shift+N for new note
      if (e.key === 'n' && modifier && e.shiftKey) {
        e.preventDefault()
        openQuickAdd('note')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo, updateItem, openQuickAdd])
}
