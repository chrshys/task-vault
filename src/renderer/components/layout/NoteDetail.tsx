import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import type { VaultNote, NoteMeta } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { RichTextEditor } from '../ui/RichTextEditor'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface NoteDetailProps {
  note: VaultNote
}

export function NoteDetail({ note }: NoteDetailProps) {
  const { updateItem, deleteItem, convertItem } = useVault()
  const { setSelectedTaskId } = useUI()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content || '')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [prevNoteId, setPrevNoteId] = useState(note.id)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const { confirm, dialogProps } = useConfirm()

  // Reset local state when note changes
  if (note.id !== prevNoteId) {
    setPrevNoteId(note.id)
    setTitle(note.title)
    setContent(note.content || '')
  }

  // Auto-resize title textarea
  useLayoutEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
  }, [title])

  const handleSave = useCallback(async () => {
    if (title === note.title && content === note.content) return
    await updateItem({
      ...note,
      title,
      content,
      meta: { ...note.meta, modified: new Date().toISOString() } as NoteMeta,
    })
  }, [note, title, content, updateItem])

  useEffect(() => {
    const timer = setTimeout(handleSave, 300)
    return () => clearTimeout(timer)
  }, [title, content, handleSave])

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${note.title}"? This action cannot be undone.`,
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

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      {/* Header with icon and control ribbon */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Note icon */}
          <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          {/* More Options dropdown */}
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

      <div className="flex-1 overflow-y-auto p-4">
        {/* Title */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          rows={1}
          className="w-full text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white mb-4 resize-none"
          placeholder="Note title..."
        />

        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Write your note..."
          className="min-h-[300px]"
        />
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}
