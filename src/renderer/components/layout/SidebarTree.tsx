import { useMemo, memo, type PropsWithChildren } from 'react'
import { SortableTree, FolderTreeItemWrapper, type TreeItemComponentProps } from 'dnd-kit-sortable-tree'
import { Folder, ListTodo, ChevronRight } from 'lucide-react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { toSortableTree, type SidebarTreeItem } from '../../utils/sidebarTreeAdapter'
import type { TreeNode } from '@shared/types'
import type { ItemChangedReason } from 'dnd-kit-sortable-tree/dist/types'

// Data type for tree items
type SidebarItemData = { node: TreeNode }

// Full props type including children
type SidebarTreeItemProps = PropsWithChildren<TreeItemComponentProps<SidebarItemData>>

// Custom tree item component
const SidebarTreeItemComponent = memo(function SidebarTreeItemComponent({
  item,
  depth,
  onCollapse,
  collapsed,
  children,
  ...props
}: SidebarTreeItemProps) {
  const { selectedView, selectedPath, setSelectedView } = useUI()

  // Access node directly from item (per Task 2 adapter implementation)
  const node = item.node

  const Icon = node.type === 'folder' ? Folder : ListTodo
  const isSelected = selectedView === node.type && selectedPath === node.path
  const isFolder = node.type === 'folder'
  const hasChildren = node.children.length > 0

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  return (
    <FolderTreeItemWrapper {...props} item={item} depth={depth} onCollapse={onCollapse} collapsed={collapsed}>
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          isSelected
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="flex items-center gap-2.5">
          {isFolder && hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCollapse?.()
              }}
              aria-label={`Toggle ${node.name}`}
              className="flex items-center justify-center -ml-1 mr-0.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronRight
                size={14}
                className={`text-gray-400 dark:text-gray-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}
              />
            </button>
          ) : isFolder ? (
            <span className="w-[18px]" />
          ) : null}
          <Icon size={16} className={isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
          <span>{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{node.count}</span>
        )}
      </button>
      {children}
    </FolderTreeItemWrapper>
  )
})

interface SidebarTreeProps {
  onItemsChange: (items: SidebarTreeItem[], reason: ItemChangedReason<SidebarItemData>) => void
}

export function SidebarTree({ onItemsChange }: SidebarTreeProps) {
  const { tree } = useVault()
  const items = useMemo(() => toSortableTree(tree), [tree])

  return (
    <SortableTree
      items={items}
      onItemsChanged={onItemsChange}
      TreeItemComponent={SidebarTreeItemComponent}
      indentationWidth={16}
    />
  )
}
