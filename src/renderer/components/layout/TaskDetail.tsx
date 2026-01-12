import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import type { VaultItem, TaskMeta } from '@shared/types'

export function TaskDetail() {
  const { items, updateItem, deleteItem } = useVault()
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const [localItem, setLocalItem] = useState<VaultItem | null>(null)

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null

  useEffect(() => {
    setLocalItem(selectedItem || null)
  }, [selectedItem])

  const handleSave = useCallback(async () => {
    if (!localItem) return
    await updateItem(localItem)
  }, [localItem, updateItem])

  useEffect(() => {
    if (!localItem || localItem === selectedItem) return
    const timeout = setTimeout(handleSave, 300)
    return () => clearTimeout(timeout)
  }, [localItem, selectedItem, handleSave])

  const handleDelete = async () => {
    if (!selectedItem) return
    await deleteItem(selectedItem.path)
    setSelectedTaskId(null)
  }

  const handleTitleChange = (title: string) => {
    if (!localItem) return
    setLocalItem({ ...localItem, title })
  }

  const handleContentChange = (content: string) => {
    if (!localItem) return
    setLocalItem({ ...localItem, content })
  }

  const handleDueChange = (due: string) => {
    if (!localItem || localItem.meta.type !== 'task') return
    setLocalItem({
      ...localItem,
      meta: { ...localItem.meta, due: due || undefined } as TaskMeta,
    })
  }

  if (!localItem) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-800">
        Select a task to view details
      </div>
    )
  }

  const isTask = localItem.meta.type === 'task'
  const due = isTask ? (localItem.meta as TaskMeta).due : undefined

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <button
          onClick={() => setSelectedTaskId(null)}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          ← Back
        </button>
        <button
          onClick={handleDelete}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <input
          type="text"
          value={localItem.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-xl font-semibold bg-transparent border-none outline-none text-white mb-4"
          placeholder="Task title"
        />

        {isTask && (
          <div className="flex gap-2 mb-4">
            <input
              type="datetime-local"
              value={due ? format(new Date(due), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => handleDueChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="px-3 py-2 bg-gray-700 rounded text-sm text-gray-200"
            />
          </div>
        )}

        <textarea
          value={localItem.content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full h-64 bg-transparent border border-gray-700 rounded p-3 text-sm text-gray-200 resize-none outline-none focus:border-gray-500"
          placeholder="Add description..."
        />
      </div>
    </div>
  )
}
