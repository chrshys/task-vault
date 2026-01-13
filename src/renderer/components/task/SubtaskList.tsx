import { useState } from 'react'
import type { VaultTask, TaskMeta } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'

interface SubtaskListProps {
  parentId: string
}

export function SubtaskList({ parentId }: SubtaskListProps) {
  const { getSubtasks, createSubtask, updateItem } = useVault()
  const [newSubtask, setNewSubtask] = useState('')
  const subtasks = getSubtasks(parentId)

  const handleAdd = async () => {
    if (!newSubtask.trim()) return
    await createSubtask(parentId, newSubtask.trim())
    setNewSubtask('')
  }

  const handleToggle = async (subtask: VaultTask) => {
    await updateItem({
      ...subtask,
      meta: {
        ...subtask.meta,
        status: subtask.meta.status === 'completed' ? 'pending' : 'completed',
        completed_at: subtask.meta.status === 'pending' ? new Date().toISOString() : undefined,
      } as TaskMeta,
    })
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Subtasks ({subtasks.length})
      </h4>

      <div className="space-y-1">
        {subtasks.map(subtask => (
          <div key={subtask.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={subtask.meta.status === 'completed'}
              onChange={() => handleToggle(subtask)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className={`text-sm ${subtask.meta.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
              {subtask.title}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add subtask..."
          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <button
          onClick={handleAdd}
          className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
        >
          Add
        </button>
      </div>
    </div>
  )
}
