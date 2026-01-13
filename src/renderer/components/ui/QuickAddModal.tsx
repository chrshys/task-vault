import { useState, useRef, useEffect } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'

interface QuickAddModalProps {
  type: 'task' | 'note'
  onClose: () => void
}

export function QuickAddModal({ type, onClose }: QuickAddModalProps) {
  const { createItem, vaultPath } = useVault()
  const { selectedPath } = useUI()
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !vaultPath) return

    // Determine target folder
    const targetFolder = selectedPath || `${vaultPath}/Inbox`
    await createItem(type, targetFolder, title.trim())
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-4">
          <div className="text-xs text-gray-500 mb-2">
            New {type === 'task' ? 'Task' : 'Note'}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={type === 'task' ? 'What needs to be done?' : 'Note title...'}
            className="w-full text-lg bg-transparent border-none outline-none text-gray-100 placeholder-gray-500"
          />
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm text-gray-400 hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
