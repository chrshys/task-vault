import { format, isToday, isTomorrow, isPast } from 'date-fns'
import type { VaultItem, TaskMeta } from '@shared/types'
import { useUI } from '../../contexts/UIContext'

interface TaskRowProps {
  item: VaultItem
  onToggleComplete: (item: VaultItem) => void
}

function formatDueDate(due: string): string {
  const date = new Date(due)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function TaskRow({ item, onToggleComplete }: TaskRowProps) {
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const isSelected = selectedTaskId === item.id
  const isTask = item.meta.type === 'task'
  const taskMeta = isTask ? (item.meta as TaskMeta) : null
  const isCompleted = taskMeta?.status === 'completed'
  const due = taskMeta?.due
  const isOverdue = due && isPast(new Date(due)) && !isCompleted

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
        isSelected ? 'bg-gray-700' : 'hover:bg-gray-800'
      }`}
      onClick={() => setSelectedTaskId(item.id)}
    >
      {isTask && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete(item)
          }}
          className={`w-5 h-5 rounded border flex items-center justify-center ${
            isCompleted
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-500 hover:border-blue-500'
          }`}
        >
          {isCompleted && <span className="text-xs">✓</span>}
        </button>
      )}

      {!isTask && (
        <span className="w-5 h-5 flex items-center justify-center text-gray-500">
          📄
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>
          {item.title}
        </p>
        {item.content && (
          <p className="text-xs text-gray-500 truncate">
            {item.content.slice(0, 60)}
          </p>
        )}
      </div>

      {due && !isCompleted && (
        <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
          {formatDueDate(due)}
        </span>
      )}
    </div>
  )
}
