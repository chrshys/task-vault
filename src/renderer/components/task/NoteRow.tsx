import { format } from 'date-fns'
import type { VaultNote } from '@shared/types'

interface NoteRowProps {
  note: VaultNote
  isSelected: boolean
  onSelect: () => void
}

export function NoteRow({ note, isSelected, onSelect }: NoteRowProps) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <span className="text-lg">Note</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {note.title || 'Untitled Note'}
        </p>
        {note.meta.created && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(note.meta.created), 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </div>
  )
}
