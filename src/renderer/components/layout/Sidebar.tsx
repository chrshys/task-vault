import { useState, useRef, useEffect } from 'react'
import { CalendarDays, CalendarRange, Inbox, ListTodo, List, Settings, Sun, Moon, Monitor, FolderPlus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SectionHeader } from './SectionHeader'
import type { TreeNode } from '@shared/types'

export function Sidebar() {
  const { sections, tree, getTodayTasks, getNext7DaysTasks, getInboxItems, createProject, deleteProject, renameProject, setProjectSection, renameSection, deleteSection, getAllSectionNames } = useVault()
  const { selectedView, selectedPath, setSelectedView, sidebarCollapsed, toggleSectionCollapse, isSectionCollapsed } = useUI()
  const { theme, setTheme } = useTheme()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showListsPopover, setShowListsPopover] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, node: TreeNode | null}>({open: false, node: null})
  const [editingProject, setEditingProject] = useState<{node: TreeNode, name: string} | null>(null)
  const editingProjectRef = useRef<{node: TreeNode, name: string} | null>(null)
  const [addingToSection, setAddingToSection] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<{name: string, newName: string} | null>(null)
  const [deleteSectionConfirm, setDeleteSectionConfirm] = useState<{open: boolean, name: string | null}>({open: false, name: null})
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const sectionContextMenu = useContextMenu<string>()
  const sectionEditInputRef = useRef<HTMLInputElement>(null)
  const listsPopoverRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const contextMenu = useContextMenu<TreeNode>()

  // Keep ref in sync with state
  useEffect(() => {
    editingProjectRef.current = editingProject
  }, [editingProject])

  const todayCount = getTodayTasks().length
  const next7Count = getNext7DaysTasks().length
  const inboxCount = getInboxItems().length

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listsPopoverRef.current && !listsPopoverRef.current.contains(e.target as Node)) {
        setShowListsPopover(false)
      }
      if (addButtonRef.current && !addButtonRef.current.contains(e.target as Node)) {
        setShowNewProject(false)
        setNewProjectName('')
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    if (showListsPopover || showNewProject || showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showListsPopover, showNewProject, showSettingsMenu])

  // Handle click outside for rename input - use ref to always get latest values
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const current = editingProjectRef.current
      if (!current) return
      if (editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
        // Trigger save on click outside
        const newName = current.name.trim()
        const oldPath = current.node.path
        const oldName = current.node.name

        setEditingProject(null)

        if (newName && newName !== oldName) {
          renameProject(oldPath, newName).then((newPath) => {
            if (selectedPath === oldPath) {
              setSelectedView('project', newPath)
            }
          })
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [renameProject, selectedPath, setSelectedView])

  const handleDeleteProject = async () => {
    if (!deleteConfirm.node || deleteConfirm.node.type !== 'project') return
    await deleteProject(deleteConfirm.node.path)
    setDeleteConfirm({open: false, node: null})
  }

  const handleStartRename = (node: TreeNode) => {
    setEditingProject({ node, name: node.name })
    // Focus will be handled by useEffect
  }

  const handleRenameSubmit = () => {
    const current = editingProjectRef.current
    if (!current) return
    const newName = current.name.trim()
    const oldPath = current.node.path
    const oldName = current.node.name

    // Clear editing state first
    setEditingProject(null)

    if (!newName || newName === oldName) {
      return
    }

    // Perform rename asynchronously after clearing state
    renameProject(oldPath, newName).then((newPath) => {
      if (selectedPath === oldPath) {
        setSelectedView('project', newPath)
      }
    })
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingProject(null)
    }
  }

  const handleCreateProjectInSection = async (sectionName: string) => {
    if (!newProjectName.trim()) return
    const project = await createProject(newProjectName.trim())
    if (sectionName) {
      const projectPath = project.path.replace(/\/_project\.md$/, '')
      await setProjectSection(projectPath, sectionName)
    }
    setNewProjectName('')
    setAddingToSection(null)
  }

  const handleStartSectionRename = (name: string) => {
    setEditingSection({ name, newName: name })
  }

  const handleSectionRenameSubmit = async () => {
    if (!editingSection) return
    const { name, newName } = editingSection
    setEditingSection(null)
    if (newName.trim() && newName !== name) {
      await renameSection(name, newName.trim())
    }
  }

  const handleDeleteSection = async () => {
    if (!deleteSectionConfirm.name) return
    await deleteSection(deleteSectionConfirm.name)
    setDeleteSectionConfirm({open: false, name: null})
  }

  const validateSectionName = (name: string): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'Section name cannot be empty'
    if (trimmed.toLowerCase() === 'projects') return '"Projects" is reserved'
    const existing = getAllSectionNames()
    if (existing.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      return 'Section already exists'
    }
    return null
  }

  const handleCreateNewSection = () => {
    const error = validateSectionName(newSectionName)
    if (!error) {
      setAddingToSection(newSectionName.trim())
      setShowNewSection(false)
      setNewSectionName('')
    }
  }

  // Focus edit input only when editing starts (not on every keystroke)
  const editingNodeId = editingProject?.node.id
  const prevEditingNodeIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (editingNodeId && editingNodeId !== prevEditingNodeIdRef.current && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
    prevEditingNodeIdRef.current = editingNodeId
  }, [editingNodeId])

  // Focus section edit input
  useEffect(() => {
    if (editingSection && sectionEditInputRef.current) {
      sectionEditInputRef.current.focus()
      sectionEditInputRef.current.select()
    }
  }, [editingSection])

  // Inbox drop zone component (expanded view)
  const InboxDropZone = () => {
    const { setNodeRef, isOver } = useDroppable({ id: 'inbox-drop' })

    return (
      <button
        ref={setNodeRef}
        onClick={() => setSelectedView('inbox')}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          isOver
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 dark:ring-blue-500'
            : selectedView === 'inbox'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Inbox size={16} className={isOver ? 'text-blue-500 dark:text-blue-400' : selectedView === 'inbox' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
          <span>Inbox</span>
        </span>
        {inboxCount > 0 && (
          <span className={`text-xs tabular-nums ${isOver ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{inboxCount}</span>
        )}
      </button>
    )
  }

  // Inbox drop zone component (collapsed view - icon only)
  const CollapsedInboxDropZone = () => {
    const { setNodeRef, isOver } = useDroppable({ id: 'inbox-drop' })

    return (
      <button
        ref={setNodeRef}
        onClick={() => setSelectedView('inbox')}
        className={`p-2.5 rounded-lg transition-colors ${
          isOver
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 dark:ring-blue-500'
            : selectedView === 'inbox'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
        title={`Inbox${inboxCount > 0 ? ` (${inboxCount})` : ''}`}
      >
        <Inbox size={18} className={isOver ? 'text-blue-500 dark:text-blue-400' : ''} />
      </button>
    )
  }

  // Render project edit input
  const renderProjectEditInput = (node: TreeNode) => {
    const isSelected = selectedView === 'project' && selectedPath === node.path
    return (
      <div
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
          isSelected
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        <span className="flex items-center gap-2.5 flex-1 min-w-0">
          <ListTodo size={16} className={`flex-shrink-0 ${isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`} />
          <input
            ref={editInputRef}
            type="text"
            value={editingProject?.name ?? ''}
            onChange={(e) => editingProject && setEditingProject({ ...editingProject, name: e.target.value })}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 min-w-0 px-1 py-0 bg-white dark:bg-gray-800 border border-blue-500 rounded text-[13px] text-gray-900 dark:text-gray-100 outline-none"
          />
        </span>
      </div>
    )
  }

  // Render a single project item (drop zone for cross-project task moves)
  const ProjectItem = ({ node, onClick }: { node: TreeNode, onClick?: () => void }) => {
    const isSelected = selectedView === 'project' && selectedPath === node.path
    const { setNodeRef, isOver } = useDroppable({
      id: `project-drop-${node.id}`,
      data: { node }
    })

    const handleClick = () => {
      setSelectedView('project', node.path)
      onClick?.()
    }

    return (
      <div
        ref={setNodeRef}
        onClick={handleClick}
        onContextMenu={(e) => contextMenu.open(e, node)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
          isOver
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 dark:ring-blue-500'
            : isSelected
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <span className="flex items-center gap-2.5 flex-1 min-w-0">
          <ListTodo size={16} className={`flex-shrink-0 ${isOver ? 'text-blue-500 dark:text-blue-400' : isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`} />
          <span className="truncate">{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className={`text-xs tabular-nums ${isOver ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{node.count}</span>
        )}
      </div>
    )
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
          <CollapsedInboxDropZone />

          {/* Lists popover */}
          {tree.length > 0 && (
            <div ref={listsPopoverRef} className="relative">
              <button
                onClick={() => setShowListsPopover(!showListsPopover)}
                className={`p-2.5 rounded-lg transition-colors ${
                  showListsPopover || selectedView === 'project'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="Projects"
              >
                <List size={18} />
              </button>
              {showListsPopover && (
                <div className="absolute left-full top-0 ml-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-80 overflow-y-auto">
                  <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Projects
                  </p>
                  {tree.map((node) => (
                    editingProject?.node.id === node.id
                      ? <div key={node.id}>{renderProjectEditInput(node)}</div>
                      : <ProjectItem
                          key={node.id}
                          node={node}
                          onClick={() => setShowListsPopover(false)}
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

          <InboxDropZone />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          {sections.map((section) => (
            <div key={section.name} className="mb-4">
              {editingSection?.name === section.name ? (
                <div className="flex items-center px-3 mb-2">
                  <input
                    ref={sectionEditInputRef}
                    type="text"
                    value={editingSection.newName}
                    onChange={(e) => setEditingSection({ ...editingSection, newName: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSectionRenameSubmit()
                      } else if (e.key === 'Escape') {
                        setEditingSection(null)
                      }
                    }}
                    onBlur={handleSectionRenameSubmit}
                    className="flex-1 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-white dark:bg-gray-800 border border-blue-500 rounded text-gray-700 dark:text-gray-300 outline-none"
                  />
                </div>
              ) : (
                <SectionHeader
                  name={section.name}
                  isDefault={section.isDefault}
                  isCollapsed={isSectionCollapsed(section.name)}
                  onToggleCollapse={() => toggleSectionCollapse(section.name)}
                  onAddProject={() => setAddingToSection(section.isDefault ? '' : section.name)}
                  onContextMenu={(e) => sectionContextMenu.open(e, section.name)}
                />
              )}

              {/* New project input for this section */}
              {addingToSection === (section.isDefault ? '' : section.name) && (
                <div className="px-3 mb-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateProjectInSection(section.isDefault ? '' : section.name)
                      } else if (e.key === 'Escape') {
                        setAddingToSection(null)
                        setNewProjectName('')
                      }
                    }}
                    placeholder="Project name..."
                    className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              )}

              {/* Projects in this section */}
              {!isSectionCollapsed(section.name) && (
                <div className="space-y-0.5">
                  {section.projects.map((node) => (
                    editingProject?.node.id === node.id
                      ? <div key={node.id}>{renderProjectEditInput(node)}</div>
                      : <ProjectItem key={node.id} node={node} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* New Section button/form */}
          {showNewSection ? (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <FolderPlus size={14} className="text-gray-400 dark:text-gray-500" />
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">New Section</span>
              </div>
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewSection()
                  } else if (e.key === 'Escape') {
                    setShowNewSection(false)
                    setNewSectionName('')
                  }
                }}
                placeholder="Section name..."
                className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowNewSection(false); setNewSectionName('') }}
                  className="px-2.5 py-1 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewSection}
                  disabled={!!validateSectionName(newSectionName)}
                  className="px-2.5 py-1 text-[12px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewSection(true)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <FolderPlus size={14} />
              <span>New Section</span>
            </button>
          )}
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

      {contextMenu.isOpen && contextMenu.data && contextMenu.data.type === 'project' && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={contextMenu.close}>
          <ContextMenuItem onClick={() => {
            handleStartRename(contextMenu.data!)
            contextMenu.close()
          }}>Rename</ContextMenuItem>
          <ContextMenuItem variant="danger" onClick={() => {
            setDeleteConfirm({open: true, node: contextMenu.data})
            contextMenu.close()
          }}>Delete</ContextMenuItem>
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

      {sectionContextMenu.isOpen && sectionContextMenu.data && (
        <ContextMenu x={sectionContextMenu.x} y={sectionContextMenu.y} onClose={sectionContextMenu.close}>
          <ContextMenuItem onClick={() => {
            handleStartSectionRename(sectionContextMenu.data!)
            sectionContextMenu.close()
          }}>Rename</ContextMenuItem>
          <ContextMenuItem variant="danger" onClick={() => {
            setDeleteSectionConfirm({open: true, name: sectionContextMenu.data})
            sectionContextMenu.close()
          }}>Delete</ContextMenuItem>
        </ContextMenu>
      )}

      <ConfirmDialog
        open={deleteSectionConfirm.open}
        title="Delete Section"
        message={`Delete section "${deleteSectionConfirm.name}"? Projects will move to the default section.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteSection}
        onCancel={() => setDeleteSectionConfirm({open: false, name: null})}
      />
    </div>
  )
}
