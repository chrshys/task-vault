import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { ThemeToggle } from '../ui/ThemeToggle'
import type { TreeNode } from '@shared/types'

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const { setSelectedView } = useUI()
  const { setNodeRef, isOver } = useDroppable({
    id: node.path,
  })

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  return (
    <div>
      <button
        ref={setNodeRef}
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-gray-300 ${
          isOver ? 'bg-blue-600/30 ring-1 ring-blue-500' : 'hover:bg-gray-700'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <span className="flex items-center gap-2">
          <span>{node.type === 'folder' ? '📁' : '📋'}</span>
          <span>{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-gray-500 text-xs">{node.count}</span>
        )}
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { tree, getTodayTasks, getNext7DaysTasks, getInboxItems, createFolder } = useVault()
  const { selectedView, setSelectedView } = useUI()
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const todayCount = getTodayTasks().length
  const next7Count = getNext7DaysTasks().length
  const inboxCount = getInboxItems().length

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim())
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder()
    } else if (e.key === 'Escape') {
      setNewFolderName('')
      setShowNewFolder(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 overflow-y-auto p-2 pt-4">
        <div className="mb-4">
          <button
            onClick={() => setSelectedView('today')}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
              selectedView === 'today' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📅</span>
              <span>Today</span>
            </span>
            {todayCount > 0 && (
              <span className="text-gray-500 text-xs">{todayCount}</span>
            )}
          </button>

          <button
            onClick={() => setSelectedView('next7')}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
              selectedView === 'next7' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📆</span>
              <span>Next 7 Days</span>
            </span>
            {next7Count > 0 && (
              <span className="text-gray-500 text-xs">{next7Count}</span>
            )}
          </button>

          <button
            onClick={() => setSelectedView('inbox')}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
              selectedView === 'inbox' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📥</span>
              <span>Inbox</span>
            </span>
            {inboxCount > 0 && (
              <span className="text-gray-500 text-xs">{inboxCount}</span>
            )}
          </button>
        </div>

        <div className="border-t border-gray-700 pt-2">
          <p className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wide">
            Lists
          </p>
          {tree.map((node) => (
            <TreeItem key={node.id} node={node} />
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-gray-700 space-y-2">
        <div className="flex justify-center">
          <ThemeToggle />
        </div>
        {showNewFolder ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Folder name..."
              className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-300 text-left"
          >
            + New Folder
          </button>
        )}
      </div>
    </div>
  )
}
