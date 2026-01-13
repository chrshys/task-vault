import { useEffect } from 'react'
import { useHistory } from '../contexts/HistoryContext'
import { useVault } from '../contexts/VaultContext'

export function useKeyboardShortcuts() {
  const { canUndo, canRedo, undo, redo } = useHistory()
  const { updateItem } = useVault()

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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo, updateItem])
}
