import { useState, useRef } from 'react'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import { motion } from 'framer-motion'
import type { VaultItem, TaskMeta, RepeatConfig } from '@shared/types'
import { REMINDER_OFFSETS } from '@shared/types'
import { useUI } from '../../contexts/UIContext'
import { useVault } from '../../contexts/VaultContext'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { InlineDueDatePicker } from '../ui/InlineDueDatePicker'

interface TaskRowProps {
  item: VaultItem
  onToggleComplete: (item: VaultItem) => void
  subtaskCount?: number
  completedSubtaskCount?: number
  isNew?: boolean
}

function formatDueDate(due: string): string {
  const date = new Date(due)
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0

  let dateText: string
  if (isToday(date)) {
    dateText = 'Today'
  } else if (isTomorrow(date)) {
    dateText = 'Tomorrow'
  } else {
    dateText = format(date, 'MMM d')
  }

  if (hasTime) {
    dateText += ' ' + format(date, 'h:mm a')
  }

  return dateText
}

function getFirstLine(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const firstBlock = doc.body.querySelector('p, li, h1, h2, h3, h4, h5, h6')
  if (firstBlock) {
    return firstBlock.textContent?.trim() || ''
  }
  return doc.body.textContent?.trim() || ''
}

function formatRemindersTooltip(reminders: number[]): string {
  return reminders
    .map(offset => REMINDER_OFFSETS.find(r => r.value === offset)?.label ?? `${offset}min`)
    .join(', ')
}

export function TaskRow({ item, onToggleComplete, subtaskCount = 0, completedSubtaskCount = 0, isNew = false }: TaskRowProps) {
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const { deleteItem, duplicateItem, convertItem, updateItem } = useVault()
  const contextMenu = useContextMenu<VaultItem>()
  const { confirm, dialogProps } = useConfirm()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const datePickerTriggerRef = useRef<HTMLButtonElement>(null)
  const isSelected = selectedTaskId === item.id
  const isTask = item.meta.type === 'task'
  const taskMeta = isTask ? (item.meta as TaskMeta) : null
  const isCompleted = taskMeta?.status === 'completed'
  const due = taskMeta?.due
  const reminders = taskMeta?.reminders ?? []
  const repeat = taskMeta?.repeat ?? null
  const hasReminders = reminders && reminders.length > 0
  const isOverdue = due && isPast(new Date(due)) && !isCompleted

  const handleDateChange = async (date: Date | null) => {
    if (!isTask) return
    const updatedItem: VaultItem = {
      ...item,
      meta: {
        ...item.meta,
        due: date?.toISOString(),
      } as TaskMeta,
    }
    await updateItem(updatedItem)
  }

  const handleRepeatChange = async (newRepeat: RepeatConfig | null) => {
    if (!isTask) return
    const updatedItem: VaultItem = {
      ...item,
      meta: {
        ...item.meta,
        repeat: newRepeat,
      } as TaskMeta,
    }
    await updateItem(updatedItem)
  }

  const handleRemindersChange = async (newReminders: number[]) => {
    if (!isTask) return
    const updatedItem: VaultItem = {
      ...item,
      meta: {
        ...item.meta,
        reminders: newReminders,
      } as TaskMeta,
    }
    await updateItem(updatedItem)
  }

  const handleDelete = async () => {
    contextMenu.close()
    // Use only first line of title to avoid showing long content in confirmation
    const displayTitle = item.title.split('\n')[0].slice(0, 100)
    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${displayTitle}"?`,
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
    <motion.div
      initial={isNew ? { backgroundColor: 'rgba(59, 130, 246, 0.2)' } : false}
      animate={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
      transition={{ backgroundColor: { duration: 0.8, delay: 0.1 } }}
      className={`flex items-start gap-3 px-3 py-3 rounded cursor-pointer ${
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
          className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded border flex items-center justify-center ${
            isCompleted
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 dark:border-gray-500 hover:border-blue-500'
          }`}
        >
          {isCompleted && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}

      {!isTask && (
        <span className="w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`text-sm break-words ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
            {item.title}
          </p>
          {subtaskCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {completedSubtaskCount}/{subtaskCount}
            </span>
          )}
        </div>
        {item.content && (
          <p className="text-xs text-gray-500 line-clamp-2">
            {getFirstLine(item.content)}
          </p>
        )}
      </div>

      {isTask && !isCompleted && (
        <div className="flex items-center flex-shrink-0 mt-0.5">
          <button
            ref={datePickerTriggerRef}
            onClick={(e) => {
              e.stopPropagation()
              setIsDatePickerOpen(prev => !prev)
            }}
            className={`flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md px-2 py-1.5 -my-1 transition-colors ${
              isOverdue ? 'text-red-400' : hasReminders && due ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
            }`}
            title={hasReminders ? `Reminders: ${formatRemindersTooltip(reminders)}` : 'No reminder set'}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {due && (
              <span className="text-xs">
                {formatDueDate(due)}
              </span>
            )}
          </button>
          <InlineDueDatePicker
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            triggerRef={datePickerTriggerRef}
            dueDate={due ? new Date(due) : null}
            repeat={repeat}
            reminders={reminders}
            onDateChange={handleDateChange}
            onRepeatChange={handleRepeatChange}
            onRemindersChange={handleRemindersChange}
          />
        </div>
      )}
    </motion.div>
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
