import { useMemo, useState, useRef, useEffect } from 'react'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ListTodo } from 'lucide-react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { useContextMenu } from '../../hooks/useContextMenu'
import { TaskRow } from '../task/TaskRow'
import { EmptyState } from '../ui/EmptyState'
import { DueDatePicker } from '../ui/DueDatePicker'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { DEFAULT_SECTION_KEY } from '@shared/types'
import type { VaultItem, RepeatConfig, TaskMeta } from '@shared/types'
import path from 'path-browserify'

const COMPLETED_COLLAPSED_KEY = 'tasklist-completed-collapsed'

function SortableTaskRow({ item, onToggleComplete }: { item: VaultItem; onToggleComplete: (item: VaultItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group flex items-start">
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-4 -ml-4 flex items-start justify-center pt-3 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <TaskRow item={item} onToggleComplete={onToggleComplete} />
      </div>
    </div>
  )
}

function ProjectGroupHeader({
  name,
  taskCount,
  isCollapsed,
  onToggleCollapse
}: {
  name: string
  taskCount: number
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <button
      onClick={onToggleCollapse}
      className="w-full flex items-center gap-2 px-1 py-2 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
    >
      <ChevronDown
        size={14}
        className={`flex-shrink-0 transition-transform duration-200 ${
          isCollapsed ? '-rotate-90' : ''
        }`}
      />
      <ListTodo size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
      <span className="truncate">{name}</span>
      {taskCount > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums ml-auto">
          {taskCount}
        </span>
      )}
    </button>
  )
}

export function TaskList() {
  const { items, vaultPath, sections, getTodayTasks, getNext7DaysTasks, getInboxItems, createItem, updateItem, renameProject } = useVault()
  const { selectedView, selectedPath, setSelectedView, selectedSectionName, toggleProjectGroupCollapse, isProjectGroupCollapsed } = useUI()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [createType, setCreateType] = useState<'task' | 'note'>('task')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null)
  const [selectedRepeat, setSelectedRepeat] = useState<RepeatConfig | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const editingTitleRef = useRef<string | null>(null)
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contextMenu = useContextMenu()
  const [completedCollapsed, setCompletedCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COMPLETED_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Get projects for the selected section with their pending tasks
  const sectionProjects = useMemo(() => {
    if (selectedView !== 'section' || selectedSectionName === null) return []

    const section = sections.find(s =>
      (s.isDefault && selectedSectionName === DEFAULT_SECTION_KEY) ||
      (!s.isDefault && s.name === selectedSectionName)
    )
    if (!section) return []

    return section.projects.map(project => {
      const projectTasks = Array.from(items.values())
        .filter(item => {
          if (item.meta.type === 'project') return false
          if (item.meta.type === 'task') {
            const taskMeta = item.meta as TaskMeta
            // Filter out completed tasks and subtasks
            if (taskMeta.status === 'completed') return false
            if (taskMeta.parent) return false
          }
          return path.dirname(item.path) === project.path
        })
        .sort((a, b) => (a.meta.sort_order ?? Infinity) - (b.meta.sort_order ?? Infinity))

      return {
        ...project,
        tasks: projectTasks,
      }
    })
  }, [selectedView, selectedSectionName, sections, items])

  // Keep ref in sync with state
  useEffect(() => {
    editingTitleRef.current = editingTitle
  }, [editingTitle])

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_COLLAPSED_KEY, String(completedCollapsed))
    } catch {
      // Ignore storage errors
    }
  }, [completedCollapsed])

  const { pendingItems, completedItems } = useMemo(() => {
    const splitAndSort = (items: VaultItem[]) => {
      const pending = items.filter(item =>
        item.meta.type !== 'task' || (item.meta as TaskMeta).status !== 'completed'
      )
      const completed = items.filter(item =>
        item.meta.type === 'task' && (item.meta as TaskMeta).status === 'completed'
      )

      // Sort pending by sort_order
      pending.sort((a, b) => (a.meta.sort_order ?? Infinity) - (b.meta.sort_order ?? Infinity))

      // Sort completed by completed_at (most recent first)
      completed.sort((a, b) => {
        const aTime = (a.meta as TaskMeta).completed_at
        const bTime = (b.meta as TaskMeta).completed_at
        if (!aTime && !bTime) return 0
        if (!aTime) return 1
        if (!bTime) return -1
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      return { pending, completed }
    }

    let allItems: VaultItem[] = []
    switch (selectedView) {
      case 'today':
        allItems = getTodayTasks()
        break
      case 'next7':
        allItems = getNext7DaysTasks()
        break
      case 'inbox':
        allItems = getInboxItems()
        break
      case 'project':
        if (!selectedPath) break
        allItems = Array.from(items.values())
          .filter(item => {
            if (item.meta.type === 'project') return false
            // Filter out subtasks - only show top-level tasks
            if (item.meta.type === 'task' && (item.meta as TaskMeta).parent) return false
            return path.dirname(item.path) === selectedPath
          })
        break
    }

    const { pending, completed } = splitAndSort(allItems)
    return { pendingItems: pending, completedItems: completed }
  }, [selectedView, selectedPath, items, getTodayTasks, getNext7DaysTasks, getInboxItems])

  const viewTitle = useMemo(() => {
    switch (selectedView) {
      case 'today': return 'Today'
      case 'next7': return 'Next 7 Days'
      case 'inbox': return 'Inbox'
      case 'project':
        if (!selectedPath) return ''
        return path.basename(selectedPath)
      case 'section':
        if (selectedSectionName === null) return ''
        if (selectedSectionName === DEFAULT_SECTION_KEY) return 'Projects'
        return selectedSectionName
      default:
        return ''
    }
  }, [selectedView, selectedPath, selectedSectionName])

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

    await createItem(createType, folder, newTaskTitle.trim(), selectedDueDate, selectedRepeat)
    setNewTaskTitle('')
    setSelectedDueDate(null)
    setSelectedRepeat(null)
    setIsInputFocused(false)
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Don't collapse if focus moves within the wrapper (e.g., clicking ribbon buttons)
    if (inputWrapperRef.current?.contains(e.relatedTarget as Node)) return
    // Don't collapse if there's content
    if (newTaskTitle.trim()) return
    setIsInputFocused(false)
  }

  const handleStartTitleEdit = () => {
    if (selectedView !== 'project' || !selectedPath) return
    setEditingTitle(viewTitle)
  }

  const handleTitleSubmit = () => {
    const currentEditingTitle = editingTitleRef.current
    if (currentEditingTitle === null || !selectedPath) {
      setEditingTitle(null)
      return
    }
    const newName = currentEditingTitle.trim()
    const currentPath = selectedPath
    const currentTitle = viewTitle

    // Clear editing state first
    setEditingTitle(null)

    if (!newName || newName === currentTitle) {
      return
    }

    // Perform rename asynchronously
    renameProject(currentPath, newName).then((newPath) => {
      setSelectedView('project', newPath)
    })
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingTitle(null)
    }
  }

  // Track if we're currently editing (for focus effect)
  const isEditing = editingTitle !== null
  const wasEditingRef = useRef(false)

  // Focus title input only when editing starts (not on every keystroke)
  useEffect(() => {
    if (isEditing && !wasEditingRef.current && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
    wasEditingRef.current = isEditing
  }, [isEditing])

  // Handle click outside for title edit input - use ref to always get latest value
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const currentEditingTitle = editingTitleRef.current
      if (currentEditingTitle === null || !selectedPath) return
      if (titleInputRef.current && !titleInputRef.current.contains(e.target as Node)) {
        const newName = currentEditingTitle.trim()
        const currentPath = selectedPath
        const currentTitle = viewTitle

        setEditingTitle(null)

        if (newName && newName !== currentTitle) {
          renameProject(currentPath, newName).then((newPath) => {
            setSelectedView('project', newPath)
          })
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedPath, viewTitle, renameProject, setSelectedView])

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      <div className="max-w-3xl w-full mx-auto px-4 pt-6 pb-4 flex items-center justify-between">
        {editingTitle !== null ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 outline-none flex-1"
          />
        ) : (
          <h2
            className={`text-lg font-semibold text-gray-900 dark:text-white ${selectedView === 'project' ? 'cursor-context-menu' : ''}`}
            onContextMenu={(e) => {
              if (selectedView === 'project' && selectedPath) {
                contextMenu.open(e, null)
              }
            }}
          >
            {viewTitle}
          </h2>
        )}
      </div>

      {selectedView !== 'section' && (
        <div className="max-w-3xl w-full mx-auto px-4 pb-4">
          <div
            ref={inputWrapperRef}
            className={`rounded-lg border transition-colors ${
              isInputFocused || newTaskTitle
                ? 'border-blue-500 bg-gray-100 dark:bg-gray-700/50'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <form onSubmit={handleCreateItem}>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={handleInputBlur}
                placeholder="Quick capture..."
                className="w-full px-3 py-3 bg-transparent rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
              />

              {/* Control Ribbon - shows when focused OR has content */}
              {(isInputFocused || newTaskTitle) && (
                <div className="flex items-center justify-between px-2 py-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-1">
                    {/* Task/Note Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setCreateType(t => {
                          if (t === 'task') {
                            setSelectedDueDate(null)
                            setSelectedRepeat(null)
                            return 'note'
                          }
                          return 'task'
                        })
                      }}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                      title={createType === 'task' ? 'Switch to Note' : 'Switch to Task'}
                    >
                      {createType === 'task' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </button>

                    {/* Due Date Button - only for tasks */}
                    {createType === 'task' && (
                      <div className="relative">
                        <DueDatePicker
                          dueDate={selectedDueDate}
                          repeat={selectedRepeat}
                          reminders={[]}
                          onDateChange={setSelectedDueDate}
                          onRepeatChange={setSelectedRepeat}
                          onRemindersChange={() => {}}
                        />
                      </div>
                    )}

                    {/* More Options */}
                    <button
                      type="button"
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                      title="More options"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                  </div>

                  {/* Add Button */}
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-4 pb-4">
        {selectedView === 'section' ? (
          // Section view with project groups
          sectionProjects.length === 0 ? (
            <EmptyState
              icon="(folder)"
              title="No projects in this section"
              description="Add projects to this section from the sidebar."
            />
          ) : (
            <div className="space-y-2">
              {sectionProjects.map((project) => {
                const isCollapsed = isProjectGroupCollapsed(project.path)
                return (
                  <div key={project.id}>
                    <ProjectGroupHeader
                      name={project.name}
                      taskCount={project.tasks.length}
                      isCollapsed={isCollapsed}
                      onToggleCollapse={() => toggleProjectGroupCollapse(project.path)}
                    />
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                      }`}
                    >
                      <div className="overflow-hidden pl-6">
                        {project.tasks.length === 0 ? (
                          <p className="py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                            No tasks in this project
                          </p>
                        ) : (
                          project.tasks.map((item) => (
                            <TaskRow
                              key={item.id}
                              item={item}
                              onToggleComplete={handleToggleComplete}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : pendingItems.length === 0 && completedItems.length === 0 ? (
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
              icon: '(project)',
              title: 'No tasks yet',
              description: 'Create your first task in this project.',
            })}
          />
        ) : (
          <>
            <SortableContext items={pendingItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {pendingItems.map((item) => (
                <SortableTaskRow
                  key={item.id}
                  item={item}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </SortableContext>

            {completedItems.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setCompletedCollapsed(prev => !prev)}
                  className="flex items-center gap-1 px-1 py-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronDown
                    size={12}
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      completedCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                  <span>Completed</span>
                  <span className="ml-1 text-gray-400 dark:text-gray-500 tabular-nums">
                    {completedItems.length}
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    completedCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <SortableContext items={completedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {completedItems.map((item) => (
                        <SortableTaskRow
                          key={item.id}
                          item={item}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {contextMenu.isOpen && selectedView === 'project' && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={contextMenu.close}>
          <ContextMenuItem onClick={() => {
            handleStartTitleEdit()
            contextMenu.close()
          }}>Rename</ContextMenuItem>
        </ContextMenu>
      )}
    </div>
  )
}
