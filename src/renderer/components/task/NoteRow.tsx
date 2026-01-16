import { format } from 'date-fns'
import type { VaultNote } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface NoteRowProps {
  note: VaultNote
  isSelected: boolean
  onSelect: () => void
}

export function NoteRow({ note, isSelected, onSelect }: NoteRowProps) {
  const { deleteItem, convertItem } = useVault()
  const contextMenu = useContextMenu<VaultNote>()
  const { confirm, dialogProps } = useConfirm()

  const handleDelete = async () => {
    contextMenu.close()
    // Use only first line of title to avoid showing long content in confirmation
    const displayTitle = note.title.split('\n')[0].slice(0, 100)
    const confirmed = await confirm({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${displayTitle}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (confirmed) {
      await deleteItem(note.path)
    }
  }

  const handleConvertToTask = async () => {
    await convertItem(note, 'task')
    contextMenu.close()
  }

  return (
    <>
    <div
      onClick={onSelect}
      onContextMenu={(e) => contextMenu.open(e, note)}
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
    {contextMenu.isOpen && (
      <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={contextMenu.close}>
        <ContextMenuItem onClick={handleConvertToTask}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
            <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Convert to Task
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDelete} variant="danger">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Delete
        </ContextMenuItem>
      </ContextMenu>
    )}
    {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}
