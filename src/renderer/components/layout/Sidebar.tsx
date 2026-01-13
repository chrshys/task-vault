import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { CalendarDays, CalendarRange, Inbox, Folder, ListTodo, List, Plus, FolderPlus, Settings, Sun, Moon, Monitor } from 'lucide-react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import type { TreeNode } from '@shared/types'

function TreeItem({
  node,
  depth = 0,
  onContextMenu
}: {
  node: TreeNode
  depth?: number
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void
}) {
  const { selectedView, selectedPath, setSelectedView } = useUI()
  const { setNodeRef, isOver } = useDroppable({
    id: node.path,
  })

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  const Icon = node.type === 'folder' ? Folder : ListTodo
  const isSelected = selectedView === node.type && selectedPath === node.path

  return (
    <div>
      <button
        ref={setNodeRef}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu?.(e, node)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          isOver
            ? 'bg-blue-600/20 ring-1 ring-blue-500'
            : isSelected
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={16} className={isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
          <span>{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{node.count}</span>
        )}
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  )
}

// Simplified tree item for popover (no drag-drop)
function PopoverTreeItem({
  node,
  depth = 0,
  onSelect,
}: {
  node: TreeNode
  depth?: number
  onSelect: () => void
}) {
  const { selectedView, selectedPath, setSelectedView } = useUI()

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
    onSelect()
  }

  const Icon = node.type === 'folder' ? Folder : ListTodo
  const isSelected = selectedView === node.type && selectedPath === node.path

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          isSelected
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={16} className={isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
          <span className="truncate">{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{node.count}</span>
        )}
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <PopoverTreeItem key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { tree, getTodayTasks, getNext7DaysTasks, getInboxItems, createFolder, createProject, ungroupFolder, deleteProject } = useVault()
  const { selectedView, setSelectedView, sidebarCollapsed } = useUI()
  const { theme, setTheme } = useTheme()
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showListsPopover, setShowListsPopover] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, node: TreeNode | null}>({open: false, node: null})
  const listsPopoverRef = useRef<HTMLDivElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const contextMenu = useContextMenu<TreeNode>()

  const todayCount = getTodayTasks().length
  const next7Count = getNext7DaysTasks().length
  const inboxCount = getInboxItems().length

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listsPopoverRef.current && !listsPopoverRef.current.contains(e.target as Node)) {
        setShowListsPopover(false)
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
        setShowNewFolder(false)
        setShowNewProject(false)
        setNewFolderName('')
        setNewProjectName('')
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    if (showListsPopover || showAddMenu || showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showListsPopover, showAddMenu, showSettingsMenu])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim())
    setNewFolderName('')
    setShowNewFolder(false)
    setShowAddMenu(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder()
    } else if (e.key === 'Escape') {
      setNewFolderName('')
      setShowNewFolder(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await createProject(newProjectName.trim())
    setNewProjectName('')
    setShowNewProject(false)
    setShowAddMenu(false)
  }

  const handleProjectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProject()
    } else if (e.key === 'Escape') {
      setNewProjectName('')
      setShowNewProject(false)
    }
  }

  const handleUngroup = async () => {
    if (!contextMenu.data || contextMenu.data.type !== 'folder') return
    await ungroupFolder(contextMenu.data.path)
    contextMenu.close()
  }

  const handleDeleteProject = async () => {
    if (!deleteConfirm.node || deleteConfirm.node.type !== 'project') return
    await deleteProject(deleteConfirm.node.path)
    setDeleteConfirm({open: false, node: null})
  }

  // Collapsed sidebar view - icon only
  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900 py-4">
        <div className="flex flex-col items-center gap-1 px-2">
          <button
            onClick={() => setSelectedView('today')}
            className={`p-2.5 rounded-lg transition-colors ${
              selectedView === 'today'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title={`Today${todayCount > 0 ? ` (${todayCount})` : ''}`}
          >
            <CalendarDays size={18} />
          </button>
          <button
            onClick={() => setSelectedView('next7')}
            className={`p-2.5 rounded-lg transition-colors ${
              selectedView === 'next7'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title={`Next 7 Days${next7Count > 0 ? ` (${next7Count})` : ''}`}
          >
            <CalendarRange size={18} />
          </button>
          <button
            onClick={() => setSelectedView('inbox')}
            className={`p-2.5 rounded-lg transition-colors ${
              selectedView === 'inbox'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title={`Inbox${inboxCount > 0 ? ` (${inboxCount})` : ''}`}
          >
            <Inbox size={18} />
          </button>

          {/* Lists popover */}
          {tree.length > 0 && (
            <div ref={listsPopoverRef} className="relative">
              <button
                onClick={() => setShowListsPopover(!showListsPopover)}
                className={`p-2.5 rounded-lg transition-colors ${
                  showListsPopover || selectedView === 'folder' || selectedView === 'project'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="Lists"
              >
                <List size={18} />
              </button>
              {showListsPopover && (
                <div className="absolute left-full top-0 ml-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-80 overflow-y-auto">
                  <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Lists
                  </p>
                  {tree.map((node) => (
                    <PopoverTreeItem
                      key={node.id}
                      node={node}
                      onSelect={() => setShowListsPopover(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex justify-center px-2">
          <div ref={settingsMenuRef} className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`p-2.5 rounded-lg transition-colors ${
                showSettingsMenu
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              title="Settings"
            >
              <Settings size={18} />
            </button>
            {showSettingsMenu && (
              <div className="absolute left-full bottom-0 ml-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Theme
                </p>
                <button
                  onClick={() => { setTheme('light'); setShowSettingsMenu(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                    theme === 'light'
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Sun size={16} />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => { setTheme('dark'); setShowSettingsMenu(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                    theme === 'dark'
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Moon size={16} />
                  <span>Dark</span>
                </button>
                <button
                  onClick={() => { setTheme('system'); setShowSettingsMenu(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                    theme === 'system'
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Monitor size={16} />
                  <span>System</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Expanded sidebar view
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto px-3 pt-4">
        <div className="space-y-0.5 mb-6">
          <button
            onClick={() => setSelectedView('today')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              selectedView === 'today'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <CalendarDays size={16} className={selectedView === 'today' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
              <span>Today</span>
            </span>
            {todayCount > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{todayCount}</span>
            )}
          </button>

          <button
            onClick={() => setSelectedView('next7')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              selectedView === 'next7'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <CalendarRange size={16} className={selectedView === 'next7' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
              <span>Next 7 Days</span>
            </span>
            {next7Count > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{next7Count}</span>
            )}
          </button>

          <button
            onClick={() => setSelectedView('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              selectedView === 'inbox'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Inbox size={16} className={selectedView === 'inbox' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
              <span>Inbox</span>
            </span>
            {inboxCount > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{inboxCount}</span>
            )}
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Lists
            </p>
            <div ref={addMenuRef} className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className={`p-1 -m-1 rounded transition-colors ${
                  showAddMenu
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title="Add new..."
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  {showNewFolder ? (
                    // Folder creation screen
                    <div className="px-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderPlus size={14} className="text-gray-400 dark:text-gray-500" />
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">New Folder</span>
                      </div>
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Folder name..."
                        className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                          className="px-2.5 py-1 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateFolder}
                          disabled={!newFolderName.trim()}
                          className="px-2.5 py-1 text-[12px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ) : showNewProject ? (
                    // Project creation screen
                    <div className="px-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ListTodo size={14} className="text-gray-400 dark:text-gray-500" />
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">New Project</span>
                      </div>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={handleProjectKeyDown}
                        placeholder="Project name..."
                        className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setShowNewProject(false); setNewProjectName('') }}
                          className="px-2.5 py-1 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateProject}
                          disabled={!newProjectName.trim()}
                          className="px-2.5 py-1 text-[12px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Menu selection screen
                    <>
                      <button
                        onClick={() => setShowNewFolder(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FolderPlus size={16} />
                        <span>New Folder</span>
                      </button>
                      <button
                        onClick={() => setShowNewProject(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ListTodo size={16} />
                        <span>New Project</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TreeItem key={node.id} node={node} onContextMenu={(e, n) => contextMenu.open(e, n)} />
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div ref={settingsMenuRef} className="relative">
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              showSettingsMenu
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
          {showSettingsMenu && (
            <div className="absolute left-0 bottom-full mb-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
              <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Theme
              </p>
              <button
                onClick={() => { setTheme('light'); setShowSettingsMenu(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                  theme === 'light'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button
                onClick={() => { setTheme('dark'); setShowSettingsMenu(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => { setTheme('system'); setShowSettingsMenu(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                  theme === 'system'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Monitor size={16} />
                <span>System</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {contextMenu.isOpen && contextMenu.data && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={contextMenu.close}>
          {contextMenu.data.type === 'folder' && (
            <ContextMenuItem onClick={handleUngroup}>Ungroup</ContextMenuItem>
          )}
          {contextMenu.data.type === 'project' && (
            <ContextMenuItem variant="danger" onClick={() => {
              setDeleteConfirm({open: true, node: contextMenu.data})
              contextMenu.close()
            }}>Delete</ContextMenuItem>
          )}
        </ContextMenu>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Project"
        message={`Delete project "${deleteConfirm.node?.name}" and all its contents?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteConfirm({open: false, node: null})}
      />
    </div>
  )
}
