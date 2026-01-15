import { useEffect, useState, useCallback, useRef } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { DueDatePicker } from '../ui/DueDatePicker'
import { RichTextEditor } from '../ui/RichTextEditor'
import { SubtaskList } from '../task/SubtaskList'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import type { VaultItem, TaskMeta, RepeatConfig } from '@shared/types'

export function TaskDetail() {
  const { items, updateItem, deleteItem, convertItem } = useVault()
  const { selectedTaskId, setSelectedTaskId, layoutMode, focusMode, toggleFocusMode } = useUI()
  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null
  // localItem tracks user edits. Component remounts when selectedTaskId changes (via Panel key),
  // so localItem is always initialized with the current selectedItem.
  const [localItem, setLocalItem] = useState<VaultItem | null>(selectedItem ?? null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const { confirm, dialogProps } = useConfirm()

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
    // Use only first line of title to avoid showing long content in confirmation
    const displayTitle = selectedItem.title.split('\n')[0].slice(0, 100)
    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${displayTitle}"? This action cannot be undone.`,
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

  // Auto-resize title textarea - use useEffect (not useLayoutEffect) to ensure
  // the flex container has calculated its width before we measure scrollHeight.
  // Without this, scrollHeight can be huge when width is 0, causing the 192px
  // max height to be applied even for short titles, creating unwanted whitespace.
  useEffect(() => {
    if (titleRef.current) {
      // Use requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        if (titleRef.current) {
          // Reset to single line to get accurate scrollHeight
          titleRef.current.style.height = '24px'
          // Calculate needed height, capped at 144px (about 6 lines)
          const scrollHeight = titleRef.current.scrollHeight
          const newHeight = Math.min(Math.max(scrollHeight, 24), 144)
          titleRef.current.style.height = newHeight + 'px'
        }
      })
    }
  }, [localItem?.title])

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

  const handleRemindersChange = (reminders: number[]) => {
    if (!localItem || localItem.meta.type !== 'task') return
    setLocalItem({
      ...localItem,
      meta: { ...localItem.meta, reminders } as TaskMeta,
    })
  }

  const handleConvert = async () => {
    if (!localItem) return
    const newType = localItem.meta.type === 'task' ? 'note' : 'task'
    await convertItem(localItem, newType)
    setShowMoreMenu(false)
  }

  // Click outside to close more menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMoreMenu])

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
  const isCompleted = taskMeta?.status === 'completed'

  const handleToggleComplete = () => {
    if (!localItem || !isTask) return
    setLocalItem({
      ...localItem,
      meta: {
        ...localItem.meta,
        status: isCompleted ? 'pending' : 'completed',
        completed_at: isCompleted ? undefined : new Date().toISOString(),
      } as TaskMeta,
    })
  }

  const showFocusToggle = layoutMode !== 'mobile'

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Navigation row */}
      <div className="flex-shrink-0 flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setSelectedTaskId(null)}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
          title="Close panel"
        >
          <X size={18} />
        </button>
        {isTask && (
          <>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-2" />
            <button
              type="button"
              onClick={handleToggleComplete}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                isCompleted
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 dark:border-gray-500 hover:border-blue-500'
              }`}
              title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            >
              {isCompleted && (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-2" />
            <DueDatePicker
              dueDate={due ? new Date(due) : null}
              repeat={repeat ?? null}
              reminders={taskMeta?.reminders ?? []}
              onDateChange={(date) => handleDueChange(date?.toISOString() || '')}
              onRepeatChange={handleRepeatChange}
              onRemindersChange={handleRemindersChange}
            />
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {showFocusToggle && (
            <button
              type="button"
              onClick={toggleFocusMode}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
              title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              {focusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          <div ref={moreMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
              title="More options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {showMoreMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={handleConvert}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {isTask ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Convert to Note
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                      Convert to Task
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowMoreMenu(false)
                    handleDelete()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-10 pb-4">
        <div className="max-w-[600px] mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <textarea
            ref={titleRef}
            value={localItem.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
            rows={1}
            className={`flex-1 text-lg font-semibold bg-transparent border-none outline-none resize-none leading-6 ${
              isCompleted
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-900 dark:text-white'
            }`}
            style={{ height: '24px', overflow: 'hidden' }}
            placeholder={isTask ? "Task title" : "Note title"}
          />
        </div>

        <RichTextEditor
          content={localItem.content ?? ''}
          onChange={handleContentChange}
          placeholder="Add description..."
          className="min-h-[200px]"
          showToolbar={false}
        />

        {isTask && <SubtaskList parentId={localItem.id} />}
        </div>
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}
