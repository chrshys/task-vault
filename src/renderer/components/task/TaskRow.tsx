import { format, isToday, isTomorrow, isPast } from 'date-fns'
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

function getFirstLine(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const firstBlock = doc.body.querySelector('p, li, h1, h2, h3, h4, h5, h6')
  if (firstBlock) {
    return firstBlock.textContent?.trim() || ''
  }
  return doc.body.textContent?.trim() || ''
}

export function TaskRow({ item, onToggleComplete, subtaskCount = 0, completedSubtaskCount = 0 }: TaskRowProps) {
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const { deleteItem, duplicateItem, convertItem } = useVault()
  const contextMenu = useContextMenu<VaultItem>()
  const { confirm, dialogProps } = useConfirm()
  const isSelected = selectedTaskId === item.id
  const isTask = item.meta.type === 'task'
  const taskMeta = isTask ? (item.meta as TaskMeta) : null
  const isCompleted = taskMeta?.status === 'completed'
  const due = taskMeta?.due
  const isOverdue = due && isPast(new Date(due)) && !isCompleted

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
    await convertItem(item, 'note')
    contextMenu.close()
  }

  const handleConvertToTask = async () => {
    await convertItem(item, 'task')
    contextMenu.close()
  }

  return (
    <>
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
        isSelected ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
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
        <span className="w-5 h-5 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
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
            {getFirstLine(item.content)}
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
        {isTask ? (
          <ContextMenuItem onClick={handleConvertToNote}>Convert to Note</ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={handleConvertToTask}>Convert to Task</ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleDelete} variant="danger">Delete</ContextMenuItem>
      </ContextMenu>
    )}
    {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}
