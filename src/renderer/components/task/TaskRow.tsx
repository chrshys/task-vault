import { format, isToday, isTomorrow, isPast } from 'date-fns'
import { useDraggable } from '@dnd-kit/core'
import type { VaultItem, TaskMeta } from '@shared/types'
import { useUI } from '../../contexts/UIContext'
import { useVault } from '../../contexts/VaultContext'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface TaskRowProps {
  item: VaultItem
  onToggleComplete: (item: VaultItem) => void
  subtaskCount?: number
  completedSubtaskCount?: number
}

function formatDueDate(due: string): string {
  const date = new Date(due)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function TaskRow({ item, onToggleComplete, subtaskCount = 0, completedSubtaskCount = 0 }: TaskRowProps) {
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const { deleteItem, duplicateItem, convertItem } = useVault()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  })
  const contextMenu = useContextMenu<VaultItem>()
  const { confirm, dialogProps } = useConfirm()
  const isSelected = selectedTaskId === item.id
  const isTask = item.meta.type === 'task'
  const taskMeta = isTask ? (item.meta as TaskMeta) : null
  const isCompleted = taskMeta?.status === 'completed'
  const due = taskMeta?.due
  const isOverdue = due && isPast(new Date(due)) && !isCompleted

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const handleDelete = async () => {
    contextMenu.close()
    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${item.title}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (confirmed) {
      await deleteItem(item.path)
    }
  }

  const handleDuplicate = async () => {
    contextMenu.close()
    await duplicateItem(item)
  }

  const handleConvertToNote = async () => {
    contextMenu.close()
    await convertItem(item, 'note')
  }

  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
        isSelected ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => setSelectedTaskId(item.id)}
      onContextMenu={(e) => contextMenu.open(e, item)}
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
              : 'border-gray-400 dark:border-gray-500 hover:border-blue-500'
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
        <div className="flex items-center gap-2">
          <p className={`text-sm truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
            {item.title}
          </p>
          {subtaskCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedSubtaskCount}/{subtaskCount}
            </span>
          )}
        </div>
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
    {contextMenu.isOpen && (
      <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={contextMenu.close}>
        <ContextMenuItem onClick={handleDuplicate}>Duplicate</ContextMenuItem>
        {isTask && (
          <ContextMenuItem onClick={handleConvertToNote}>Convert to Note</ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleDelete} variant="danger">Delete</ContextMenuItem>
      </ContextMenu>
    )}
    {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}
