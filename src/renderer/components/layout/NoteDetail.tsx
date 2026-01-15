import { useState, useEffect, useCallback, useRef } from 'react'
import type { VaultNote, NoteMeta } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { RichTextEditor } from '../ui/RichTextEditor'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface NoteDetailProps {
  note: VaultNote
}

export function NoteDetail({ note }: NoteDetailProps) {
  const { updateItem, deleteItem, convertItem } = useVault()
  const { setSelectedTaskId, layoutMode, focusMode, toggleFocusMode } = useUI()
  const [localNote, setLocalNote] = useState<VaultNote>(note)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const { confirm, dialogProps } = useConfirm()

  // localNote tracks user edits. Component remounts when note.id changes (via Panel key),
  // so localNote is always initialized with the current note.
  const displayTitle = localNote.title
  const displayContent = localNote.content || ''

  // Auto-resize title textarea - use useEffect (not useLayoutEffect) to ensure
  // the flex container has calculated its width before we measure scrollHeight
  useEffect(() => {
    if (titleRef.current) {
      // Use requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        if (titleRef.current) {
          titleRef.current.style.height = '24px'
          const scrollHeight = titleRef.current.scrollHeight
          const newHeight = Math.min(Math.max(scrollHeight, 24), 144)
          titleRef.current.style.height = newHeight + 'px'
        }
      })
    }
  }, [displayTitle])

  const handleSave = useCallback(async () => {
    if (localNote.title === note.title && localNote.content === note.content) return
    await updateItem({
      ...note,
      title: localNote.title,
      content: localNote.content,
      meta: { ...note.meta, modified: new Date().toISOString() } as NoteMeta,
    })
  }, [note, localNote, updateItem])

  useEffect(() => {
    const timer = setTimeout(handleSave, 300)
    return () => clearTimeout(timer)
  }, [localNote, handleSave])

  const handleTitleChange = (nextTitle: string) => {
    setLocalNote(prev => ({ ...prev, title: nextTitle }))
  }

  const handleContentChange = (nextContent: string) => {
    setLocalNote(prev => ({ ...prev, content: nextContent }))
  }

  const handleDelete = async () => {
    // Use only first line of title to avoid showing long content in confirmation
    const truncatedTitle = note.title.split('\n')[0].slice(0, 100)
    const confirmed = await confirm({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${truncatedTitle}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return
    await deleteItem(note.path)
    setSelectedTaskId(null)
  }

  const handleConvert = async () => {
    await convertItem(note, 'task')
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Convert to Task
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
        <div className="mb-4">
          <textarea
            ref={titleRef}
            value={displayTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
            rows={1}
            className="w-full text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white resize-none leading-6"
            style={{ height: '24px', overflow: 'hidden' }}
            placeholder="Note title..."
          />
        </div>

        <RichTextEditor
          key={note.id}
          content={displayContent}
          onChange={handleContentChange}
          placeholder="Write your note..."
          className="min-h-[300px]"
          showToolbar={false}
        />
        </div>
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}
