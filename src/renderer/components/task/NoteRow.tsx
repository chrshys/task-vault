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
  const { deleteItem, duplicateItem, convertItem } = useVault()
  const contextMenu = useContextMenu<VaultNote>()
  const { confirm, dialogProps } = useConfirm()

  const handleDelete = async () => {
    contextMenu.close()
    const confirmed = await confirm({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${note.title}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (confirmed) {
      await deleteItem(note.path)
    }
  }

  const handleDuplicate = async () => {
    contextMenu.close()
    await duplicateItem(note)
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
        <ContextMenuItem onClick={handleDuplicate}>Duplicate</ContextMenuItem>
        <ContextMenuItem onClick={handleConvertToTask}>Convert to Task</ContextMenuItem>
        <ContextMenuItem onClick={handleDelete} variant="danger">Delete</ContextMenuItem>
      </ContextMenu>
    )}
    {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}
