import { useEffect, useState, useCallback } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { DateTimePicker } from '../ui/DateTimePicker'
import { RichTextEditor } from '../ui/RichTextEditor'
import { RecurrencePicker } from '../ui/RecurrencePicker'
import { SubtaskList } from '../task/SubtaskList'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import type { VaultItem, TaskMeta, RepeatConfig } from '@shared/types'

export function TaskDetail() {
  const { items, updateItem, deleteItem } = useVault()
  const { selectedTaskId, setSelectedTaskId } = useUI()
  const [localItem, setLocalItem] = useState<VaultItem | null>(null)
  const { confirm, dialogProps } = useConfirm()

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
    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${selectedItem.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return
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

  const handleRepeatChange = (repeat: RepeatConfig | null) => {
    if (!localItem || localItem.meta.type !== 'task') return
    setLocalItem({
      ...localItem,
      meta: { ...localItem.meta, repeat } as TaskMeta,
    })
  }

  if (!localItem) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800">
        Select a task to view details
      </div>
    )
  }

  const isTask = localItem.meta.type === 'task'
  const taskMeta = isTask ? (localItem.meta as TaskMeta) : null
  const due = taskMeta?.due
  const repeat = taskMeta?.repeat

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={() => setSelectedTaskId(null)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← Back
        </button>
        <button
          onClick={handleDelete}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
        >
          Delete
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <input
          type="text"
          value={localItem.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white mb-4"
          placeholder="Task title"
        />

        {isTask && (
          <div className="flex gap-2 mb-4">
            <DateTimePicker
              value={due ? new Date(due) : null}
              onChange={(date) => handleDueChange(date?.toISOString() || '')}
              placeholder="Add due date..."
            />
            <RecurrencePicker
              value={repeat}
              onChange={handleRepeatChange}
            />
          </div>
        )}

        <RichTextEditor
          content={localItem.content}
          onChange={handleContentChange}
          placeholder="Add description..."
          className="min-h-[200px]"
        />

        {isTask && <SubtaskList parentId={localItem.id} />}
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}
