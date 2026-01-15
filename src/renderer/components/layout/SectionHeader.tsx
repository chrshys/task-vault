import { ChevronDown, Plus } from 'lucide-react'
import { useDroppable, type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core'

interface SectionHeaderProps {
  name: string
  isDefault: boolean
  isCollapsed: boolean
  isSelected: boolean
  onToggleCollapse: () => void
  onSelectSection: () => void
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
  isSelected,
  onToggleCollapse,
  onSelectSection,
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
        isSelected
          ? 'bg-gray-200 dark:bg-gray-700'
          : isOver
            ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500'
            : ''
      }`}
      style={{ opacity: isDragging ? 0.6 : 1 }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapse()
          }}
          className="p-0.5 -m-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ChevronDown
            size={12}
            className={`flex-shrink-0 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`}
          />
        </button>
        <button
          onClick={onSelectSection}
          ref={dragActivatorRef}
          {...dragAttributes}
          {...dragListeners}
          className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${
            isSelected
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          {name}
        </button>
      </div>
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
