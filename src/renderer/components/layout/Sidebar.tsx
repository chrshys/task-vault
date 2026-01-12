import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import type { TreeNode } from '@shared/types'

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const { setSelectedView } = useUI()

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-700 text-sm text-gray-300"
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
  const { tree, getTodayTasks, getNext7DaysTasks, getInboxItems } = useVault()
  const { selectedView, setSelectedView } = useUI()

  const todayCount = getTodayTasks().length
  const next7Count = getNext7DaysTasks().length
  const inboxCount = getInboxItems().length

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="p-4 border-b border-gray-700">
        <h1 className="font-semibold text-white">TaskVault</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
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

      <div className="p-2 border-t border-gray-700">
        <button className="w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-300 text-left">
          + New Folder
        </button>
      </div>
    </div>
  )
}
