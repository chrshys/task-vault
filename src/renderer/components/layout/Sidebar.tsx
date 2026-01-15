import { useState, useRef, useEffect, useCallback } from 'react'
import { CalendarDays, CalendarRange, Inbox, ListTodo, List, Settings, Sun, Moon, Monitor, FolderPlus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SectionHeader } from './SectionHeader'
import type { TreeNode, SectionGroup } from '@shared/types'
import { DEFAULT_SECTION_KEY } from '@shared/types'

interface SidebarProps {
  forceCollapsed?: boolean
  onNavigate?: () => void
}

export function Sidebar({ forceCollapsed, onNavigate }: SidebarProps = {}) {
  const { sections, tree, getTodayTasks, getNext7DaysTasks, getInboxItems, createProject, deleteProject, renameProject, addSection, renameSection, deleteSection, getAllSectionNames } = useVault()
  const { selectedView, selectedPath, setSelectedView: setSelectedViewBase, sidebarCollapsed: sidebarCollapsedFromContext, toggleSectionCollapse, isSectionCollapsed, selectedSectionName, setSelectedSection } = useUI()

  const sidebarCollapsed = forceCollapsed ?? sidebarCollapsedFromContext

  const setSelectedView = useCallback((view: Parameters<typeof setSelectedViewBase>[0], path?: string) => {
    setSelectedViewBase(view, path)
    onNavigate?.()
  }, [setSelectedViewBase, onNavigate])
  const { theme, setTheme } = useTheme()
  const [newProjectName, setNewProjectName] = useState('')
  const [showListsPopover, setShowListsPopover] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, node: TreeNode | null}>({open: false, node: null})
  const [editingProject, setEditingProject] = useState<{node: TreeNode, name: string} | null>(null)
  const editingProjectRef = useRef<{node: TreeNode, name: string} | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const editingSectionRef = useRef<{name: string, value: string} | null>(null)
  const shouldFocusSectionEditRef = useRef(false)
  const [deleteSectionConfirm, setDeleteSectionConfirm] = useState<{open: boolean, name: string | null}>({open: false, name: null})
  const [newSectionName, setNewSectionName] = useState('')
  const [sectionMenu, setSectionMenu] = useState<{sectionKey: string, sectionLabel: string, step: 'root' | 'project' | 'section'} | null>(null)
  const sectionContextMenu = useContextMenu<{ name: string, isDefault: boolean }>()
  const sectionEditInputRef = useRef<HTMLInputElement>(null)
  const listsPopoverRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const contextMenu = useContextMenu<TreeNode>()
  const sectionMenuRef = useRef<HTMLDivElement>(null)

  // Keep ref in sync with state
  useEffect(() => {
    editingProjectRef.current = editingProject
  }, [editingProject])

  useEffect(() => {
    if (!editingSection) return
    if (!editingSectionRef.current) {
      editingSectionRef.current = { name: editingSection, value: editingSection }
    }
  }, [editingSection])

  const todayCount = getTodayTasks().length
  const next7Count = getNext7DaysTasks().length
  const inboxCount = getInboxItems().length

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listsPopoverRef.current && !listsPopoverRef.current.contains(e.target as Node)) {
        setShowListsPopover(false)
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false)
      }
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) {
        setSectionMenu(null)
        setNewProjectName('')
        setNewSectionName('')
      }
    }
    if (showListsPopover || showSettingsMenu || sectionMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showListsPopover, showSettingsMenu, sectionMenu])

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

  const handleCreateProjectInSection = async (sectionKey: string, projectName?: string) => {
    const trimmedName = (projectName ?? newProjectName).trim()
    if (!trimmedName) return
    await createProject(trimmedName, sectionKey === DEFAULT_SECTION_KEY ? null : sectionKey)
    setNewProjectName('')
    setSectionMenu(null)
  }

  const handleStartSectionRename = (name: string) => {
    shouldFocusSectionEditRef.current = true
    const next = { name, value: name }
    editingSectionRef.current = next
    setEditingSection(name)
  }

  const handleSectionRenameSubmit = useCallback(async (valueOverride?: string) => {
    const current = editingSectionRef.current
    if (!current) return
    const { name, value } = current
    const nextName = valueOverride ?? value
    editingSectionRef.current = null
    setEditingSection(null)
    if (nextName.trim() && nextName !== name) {
      await renameSection(name, nextName.trim())
    }
  }, [renameSection])

  const handleDeleteSection = async () => {
    if (!deleteSectionConfirm.name) return
    await deleteSection(deleteSectionConfirm.name)
    setDeleteSectionConfirm({open: false, name: null})
  }

  const validateSectionName = (name: string): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'Section name cannot be empty'
    const existing = getAllSectionNames()
    if (existing.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      return 'Section already exists'
    }
    return null
  }

  const handleCreateNewSection = async () => {
    const error = validateSectionName(newSectionName)
    if (!error) {
      await addSection(newSectionName.trim())
      setNewSectionName('')
      setSectionMenu(null)
    }
  }

  const handleOpenSectionMenu = (sectionKey: string, sectionLabel: string) => {
    setSectionMenu({ sectionKey, sectionLabel, step: 'root' })
    setNewProjectName('')
    setNewSectionName('')
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

  // Focus section edit input only when editing starts
  useEffect(() => {
    if (editingSection && shouldFocusSectionEditRef.current && sectionEditInputRef.current) {
      shouldFocusSectionEditRef.current = false
      sectionEditInputRef.current.focus()
      sectionEditInputRef.current.select()
    }
  }, [editingSection])

  // Save section rename on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!editingSectionRef.current) return
      if (sectionEditInputRef.current && !sectionEditInputRef.current.contains(e.target as Node)) {
        handleSectionRenameSubmit(sectionEditInputRef.current.value)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleSectionRenameSubmit])

  // Inbox drop zone component (expanded view)
  const InboxDropZone = () => {
    const { setNodeRef, isOver } = useDroppable({ id: 'inbox-drop' })

    return (
      <button
        ref={setNodeRef}
        onClick={() => setSelectedView('inbox')}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
          isOver
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 dark:ring-blue-500'
            : selectedView === 'inbox'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <span className="flex items-center gap-2">
          <Inbox size={15} className={isOver ? 'text-blue-500 dark:text-blue-400' : selectedView === 'inbox' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
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
        <Inbox size={20} className={isOver ? 'text-blue-500 dark:text-blue-400' : ''} />
      </button>
    )
  }

  // Render project edit input
  const renderProjectEditInput = (node: TreeNode) => {
    const isSelected = selectedView === 'project' && selectedPath === node.path
    return (
      <div
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
          isSelected
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          <ListTodo size={15} className={`flex-shrink-0 ${isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`} />
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
  const ProjectItem = ({ node, sectionKey, onClick }: { node: TreeNode, sectionKey: string, onClick?: () => void }) => {
    const isSelected = selectedView === 'project' && selectedPath === node.path
    const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({
      id: node.id,
      data: { node, type: 'project', sectionKey },
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
        {...attributes}
        {...listeners}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
          isOver
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 dark:ring-blue-500'
            : isSelected
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={{
          opacity: isDragging ? 0.6 : 1,
          transform: CSS.Transform.toString(transform),
          transition,
        }}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          <ListTodo size={15} className={`flex-shrink-0 ${isOver ? 'text-blue-500 dark:text-blue-400' : isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`} />
          <span className="truncate">{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className={`text-xs tabular-nums ${isOver ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{node.count}</span>
        )}
      </div>
    )
  }

  const SectionItem = ({ section }: { section: SectionGroup }) => {
    const sectionKey = section.isDefault ? DEFAULT_SECTION_KEY : section.name
    const sortableId = `section:${section.isDefault ? 'default' : section.name}`
    const isEditing = editingSection === section.name
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
      id: sortableId,
      data: { type: 'section', sectionKey },
      disabled: isEditing,
    })

    const isCollapsed = isSectionCollapsed(sectionKey)

    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.6 : 1,
        }}
        className={`transition-[margin] duration-200 ease-out ${isCollapsed ? 'mb-0' : 'mb-2'}`}
      >
        {isEditing ? (
          <div className="flex items-center px-3 mb-2">
            <input
              key={editingSection ?? 'section-edit'}
              ref={sectionEditInputRef}
              type="text"
              defaultValue={editingSection ?? ''}
              onChange={(e) => {
                if (editingSectionRef.current) {
                  editingSectionRef.current.value = e.target.value
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSectionRenameSubmit(sectionEditInputRef.current?.value)
                } else if (e.key === 'Escape') {
                  editingSectionRef.current = null
                  setEditingSection(null)
                }
              }}
              onBlur={(e) => handleSectionRenameSubmit(e.currentTarget.value)}
              className="flex-1 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-white dark:bg-gray-800 border border-blue-500 rounded text-gray-700 dark:text-gray-300 outline-none"
            />
          </div>
        ) : (
          <div className="relative">
            <SectionHeader
              name={section.name}
              isDefault={section.isDefault}
              isCollapsed={isCollapsed}
              isSelected={selectedSectionName === sectionKey}
              onToggleCollapse={() => toggleSectionCollapse(sectionKey)}
              onSelectSection={() => setSelectedSection(sectionKey)}
              onAddProject={() => handleOpenSectionMenu(sectionKey, section.name)}
              onContextMenu={(e) => sectionContextMenu.open(e, { name: section.name, isDefault: section.isDefault })}
              dragAttributes={attributes}
              dragListeners={listeners}
              dragActivatorRef={setActivatorNodeRef}
              isDragging={isDragging}
            />
            {sectionMenu && sectionMenu.sectionKey === sectionKey && (
              <div
                ref={sectionMenuRef}
                className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50"
              >
                {sectionMenu.step === 'root' && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setSectionMenu({ ...sectionMenu, step: 'project' })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <ListTodo size={14} />
                      <span>New Project</span>
                    </button>
                    <button
                      onClick={() => setSectionMenu({ ...sectionMenu, step: 'section' })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <FolderPlus size={14} />
                      <span>New Section</span>
                    </button>
                  </div>
                )}

                {sectionMenu.step === 'project' && (
                  <div>
                    <p className="px-1 pb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {sectionMenu.sectionLabel}
                    </p>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateProjectInSection(sectionMenu.sectionKey)
                        } else if (e.key === 'Escape') {
                          setSectionMenu(null)
                          setNewProjectName('')
                        }
                      }}
                      placeholder="Project name..."
                      className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => { setSectionMenu(null); setNewProjectName('') }}
                        className="px-2.5 py-1 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateProjectInSection(sectionMenu.sectionKey)}
                        disabled={!newProjectName.trim()}
                        className="px-2.5 py-1 text-[12px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {sectionMenu.step === 'section' && (
                  <div>
                    <p className="px-1 pb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      New Section
                    </p>
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateNewSection()
                        } else if (e.key === 'Escape') {
                          setSectionMenu(null)
                          setNewSectionName('')
                        }
                      }}
                      placeholder="Section name..."
                      className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => { setSectionMenu(null); setNewSectionName('') }}
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
                )}
              </div>
            )}
          </div>
        )}

        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div className="overflow-hidden">
            <SortableContext
              items={section.projects.map((node) => node.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {section.projects.map((node) => (
                  editingProject?.node.id === node.id
                    ? <div key={node.id}>{renderProjectEditInput(node)}</div>
                    : <ProjectItem key={node.id} node={node} sectionKey={sectionKey} />
                ))}
              </div>
            </SortableContext>
          </div>
        </div>
      </div>
    )
  }

  // Collapsed sidebar view - icon only
  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 py-4">
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
            <CalendarDays size={20} />
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
            <CalendarRange size={20} />
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
                <List size={20} />
              </button>
              {showListsPopover && (
                  <div className="absolute left-full top-0 ml-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50 max-h-80 overflow-y-auto">
                    <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Projects
                    </p>
                  <SortableContext items={tree.map((node) => node.id)} strategy={verticalListSortingStrategy}>
                    {tree.map((node) => (
                      editingProject?.node.id === node.id
                        ? <div key={node.id}>{renderProjectEditInput(node)}</div>
                        : <ProjectItem
                            key={node.id}
                            node={node}
                            sectionKey={node.sectionName ?? DEFAULT_SECTION_KEY}
                            onClick={() => setShowListsPopover(false)}
                          />
                    ))}
                  </SortableContext>
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
              <Settings size={20} />
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
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto px-3 pt-4">
        <div className="space-y-0.5 mb-6">
          <button
            onClick={() => setSelectedView('today')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              selectedView === 'today'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <CalendarDays size={15} className={selectedView === 'today' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
              <span>Today</span>
            </span>
            {todayCount > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{todayCount}</span>
            )}
          </button>

          <button
            onClick={() => setSelectedView('next7')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              selectedView === 'next7'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <CalendarRange size={15} className={selectedView === 'next7' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
              <span>Next 7 Days</span>
            </span>
            {next7Count > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{next7Count}</span>
            )}
          </button>

          <InboxDropZone />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <SortableContext
            items={sections.map((section) => `section:${section.isDefault ? 'default' : section.name}`)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((section) => (
              <SectionItem key={section.isDefault ? 'default' : section.name} section={section} />
            ))}
          </SortableContext>

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
            handleStartSectionRename(sectionContextMenu.data!.name)
            sectionContextMenu.close()
          }}>Rename</ContextMenuItem>
          {!sectionContextMenu.data!.isDefault && (
            <ContextMenuItem variant="danger" onClick={() => {
              setDeleteSectionConfirm({open: true, name: sectionContextMenu.data!.name})
              sectionContextMenu.close()
            }}>Delete</ContextMenuItem>
          )}
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
