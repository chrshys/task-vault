import { ChevronDown, Plus } from 'lucide-react'
import { useDroppable, type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core'

interface SectionHeaderProps {
  name: string
  isDefault: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  onAddProject: () => void
  onContextMenu: (e: React.MouseEvent) => void
  dragAttributes?: DraggableAttributes
  dragListeners?: DraggableSyntheticListeners
  dragActivatorRef?: (node: HTMLButtonElement | null) => void
  isDragging?: boolean
}

export function SectionHeader({
  name,
  isDefault,
  isCollapsed,
  onToggleCollapse,
  onAddProject,
  onContextMenu,
  dragAttributes,
  dragListeners,
  dragActivatorRef,
  isDragging,
}: SectionHeaderProps) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `section-drop-${name}`,
    data: { sectionName: isDefault ? '' : name },
  })

  const setNodeRef = (node: HTMLDivElement | null) => {
    setDroppableRef(node)
  }

  return (
    <div
      ref={setNodeRef}
      onContextMenu={onContextMenu}
      className={`flex items-center justify-between px-3 mb-1 py-1 rounded-lg transition-colors ${
        isOver
          ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500'
        : ''
      }`}
      style={{ opacity: isDragging ? 0.6 : 1 }}
    >
      <button
        onClick={onToggleCollapse}
        ref={dragActivatorRef}
        {...dragAttributes}
        {...dragListeners}
        className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <ChevronDown
          size={12}
          className={`flex-shrink-0 transition-transform duration-200 ${
            isCollapsed ? '-rotate-90' : ''
          }`}
        />
        <span>{name}</span>
      </button>
      <button
        onClick={onAddProject}
        className="p-1 -m-1 rounded transition-colors text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
        title={`New project in ${name}`}
      >
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  )
}
