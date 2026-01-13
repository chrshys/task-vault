import { useState, useEffect, useCallback } from 'react'
import type { VaultNote, NoteMeta } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'

interface NoteDetailProps {
  note: VaultNote
}

export function NoteDetail({ note }: NoteDetailProps) {
  const { updateItem, deleteItem } = useVault()
  const { setSelectedTaskId } = useUI()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content || '')

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content || '')
  }, [note.id])

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
    await deleteItem(note.path)
    setSelectedTaskId(null)
  }

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <button
          onClick={() => setSelectedTaskId(null)}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          ← Back
        </button>
        <button
          onClick={handleDelete}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-xl font-semibold bg-transparent border-none outline-none text-white mb-4"
          placeholder="Note title..."
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-64 bg-transparent border border-gray-700 rounded p-3 text-sm text-gray-200 resize-none outline-none focus:border-gray-500"
          placeholder="Write your note..."
        />
      </div>
    </div>
  )
}
