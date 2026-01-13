import { useMemo, useState } from 'react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { TaskRow } from '../task/TaskRow'
import { EmptyState } from '../ui/EmptyState'
import type { VaultItem } from '@shared/types'
import path from 'path-browserify'

export function TaskList() {
  const { items, vaultPath, getTodayTasks, getNext7DaysTasks, getInboxItems, createItem, updateItem } = useVault()
  const { selectedView, selectedPath } = useUI()
  const [newTaskTitle, setNewTaskTitle] = useState('')

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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const folder = selectedPath || (vaultPath ? path.join(vaultPath, 'Inbox') : null)
    if (!folder) return

    await createItem('task', folder, newTaskTitle.trim())
    setNewTaskTitle('')
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">{viewTitle}</h2>
      </div>

      <div className="p-2 border-b border-gray-700">
        <form onSubmit={handleCreateTask}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="+ Add task"
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
          displayItems.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              onToggleComplete={handleToggleComplete}
            />
          ))
        )}
      </div>
    </div>
  )
}
