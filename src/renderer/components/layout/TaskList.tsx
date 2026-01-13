import { useMemo, useState } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { TaskRow } from '../task/TaskRow'
import { NoteRow } from '../task/NoteRow'
import { EmptyState } from '../ui/EmptyState'
import type { VaultItem, VaultNote } from '@shared/types'
import path from 'path-browserify'

export function TaskList() {
  const { items, vaultPath, getTodayTasks, getNext7DaysTasks, getInboxItems, createItem, updateItem } = useVault()
  const { selectedView, selectedPath, selectedTaskId, setSelectedTaskId } = useUI()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [createType, setCreateType] = useState<'task' | 'note'>('task')

  const displayItems = useMemo(() => {
    switch (selectedView) {
      case 'today':
        return getTodayTasks()
      case 'next7':
        return getNext7DaysTasks()
      case 'inbox':
        return getInboxItems()
      case 'folder':
      case 'project':
        if (!selectedPath) return []
        return Array.from(items.values()).filter(item => {
          if (item.meta.type === 'folder' || item.meta.type === 'project') return false
          return path.dirname(item.path) === selectedPath
        })
      default:
        return []
    }
  }, [selectedView, selectedPath, items, getTodayTasks, getNext7DaysTasks, getInboxItems])

  const viewTitle = useMemo(() => {
    switch (selectedView) {
      case 'today': return 'Today'
      case 'next7': return 'Next 7 Days'
      case 'inbox': return 'Inbox'
      case 'folder':
      case 'project':
        if (!selectedPath) return ''
        return path.basename(selectedPath)
      default:
        return ''
    }
  }, [selectedView, selectedPath])

  const handleToggleComplete = async (item: VaultItem) => {
    if (item.meta.type !== 'task') return

    const updatedItem: VaultItem = {
      ...item,
      meta: {
        ...item.meta,
        status: item.meta.status === 'completed' ? 'pending' : 'completed',
        completed_at: item.meta.status === 'pending' ? new Date().toISOString() : undefined,
      },
    }
    await updateItem(updatedItem)
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const folder = selectedPath || (vaultPath ? path.join(vaultPath, 'Inbox') : null)
    if (!folder) return

    await createItem(createType, folder, newTaskTitle.trim())
    setNewTaskTitle('')
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">{viewTitle}</h2>
      </div>

      <div className="p-2 border-b border-gray-700">
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setCreateType('task')}
            className={`px-2 py-1 text-xs rounded ${createType === 'task' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Task
          </button>
          <button
            onClick={() => setCreateType('note')}
            className={`px-2 py-1 text-xs rounded ${createType === 'note' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Note
          </button>
        </div>
        <form onSubmit={handleCreateItem}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder={`+ Add ${createType}`}
            className="w-full px-3 py-2 bg-transparent border border-transparent rounded text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-gray-600"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {displayItems.length === 0 ? (
          <EmptyState
            {...(selectedView === 'today' ? {
              icon: '(tada)',
              title: 'All done for today!',
              description: 'No tasks due today. Enjoy your day or add something new.',
            } : selectedView === 'next7' ? {
              icon: '(calendar)',
              title: 'Week looks clear',
              description: 'No tasks due in the next 7 days.',
            } : selectedView === 'inbox' ? {
              icon: '(inbox)',
              title: 'Inbox is empty',
              description: 'Items without a folder appear here.',
            } : {
              icon: '(folder)',
              title: 'No tasks yet',
              description: 'Create your first task in this folder.',
            })}
          />
        ) : (
          <>
            {displayItems
              .filter(item => item.meta.type === 'task')
              .map((item) => (
                <TaskRow
                  key={item.id}
                  item={item}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            {displayItems.filter(item => item.meta.type === 'note').length > 0 && (
              <div className="mt-4">
                <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Notes
                </h3>
                {displayItems
                  .filter(item => item.meta.type === 'note')
                  .map((item) => (
                    <NoteRow
                      key={item.id}
                      note={item as VaultNote}
                      isSelected={selectedTaskId === item.id}
                      onSelect={() => setSelectedTaskId(item.id)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
