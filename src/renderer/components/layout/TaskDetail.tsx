import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { Maximize2, Minimize2 } from 'lucide-react'
import { DueDatePicker } from '../ui/DueDatePicker'
import { RichTextEditor } from '../ui/RichTextEditor'
import { SubtaskList } from '../task/SubtaskList'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import type { VaultItem, TaskMeta, RepeatConfig } from '@shared/types'

export function TaskDetail() {
  const { items, updateItem, deleteItem, convertItem } = useVault()
  const { selectedTaskId, setSelectedTaskId, layoutMode, focusMode, toggleFocusMode } = useUI()
  const [localItem, setLocalItem] = useState<VaultItem | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const { confirm, dialogProps } = useConfirm()

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(selectedItem?.id ?? null)

  useEffect(() => {
    if (selectedItem?.id !== prevSelectedId) {
      setPrevSelectedId(selectedItem?.id ?? null)
      setLocalItem(selectedItem ?? null)
    }
  }, [selectedItem, prevSelectedId])

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

  // Auto-resize title textarea
  useLayoutEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-3 mb-3">
          {isTask ? (
            <button
              type="button"
              onClick={handleToggleComplete}
              className={`w-5 h-5 mt-1 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                isCompleted
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-400 dark:border-gray-500 hover:border-blue-500'
              }`}
            >
              {isCompleted && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}

          <textarea
            ref={titleRef}
            value={localItem.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
            rows={1}
            className={`flex-1 text-xl font-semibold bg-transparent border-none outline-none resize-none ${
              isCompleted
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-900 dark:text-white'
            }`}
            placeholder={isTask ? "Task title" : "Note title"}
          />
        </div>

        <div className="flex items-center gap-2 mb-4 ml-8">
          {isTask && (
            <DueDatePicker
              dueDate={due ? new Date(due) : null}
              repeat={repeat ?? null}
              onDateChange={(date) => handleDueChange(date?.toISOString() || '')}
              onRepeatChange={handleRepeatChange}
            />
          )}

          <div className="flex items-center gap-2 ml-auto">
            {showFocusToggle && (
              <button
                type="button"
                onClick={toggleFocusMode}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
              >
                {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <div ref={moreMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                title="More options"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              {showMoreMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
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

        <div className="ml-8">
          <RichTextEditor
            content={localItem.content ?? ''}
            onChange={handleContentChange}
            placeholder="Add description..."
            className="min-h-[200px]"
          />

          {isTask && <SubtaskList parentId={localItem.id} />}
        </div>
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}
