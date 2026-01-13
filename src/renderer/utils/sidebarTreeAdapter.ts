import type { TreeNode } from '@shared/types'
import type { TreeItem } from 'dnd-kit-sortable-tree'
import type { UniqueIdentifier } from '@dnd-kit/core'

/**
 * Extended TreeItem type that includes the original TreeNode data
 * and explicit parent tracking for the flat structure.
 */
export type SidebarTreeItem = TreeItem<{ node: TreeNode }> & {
  parentId: UniqueIdentifier | null
}

/**
 * Converts a nested TreeNode[] to a flat array of SidebarTreeItem.
 * dnd-kit-sortable-tree uses flat arrays with parentId for hierarchy.
 */
export function toSortableTree(
  nodes: TreeNode[],
  parentId: UniqueIdentifier | null = null
): SidebarTreeItem[] {
  const result: SidebarTreeItem[] = []

  for (const node of nodes) {
    result.push({
      id: node.id,
      parentId,
      canHaveChildren: node.type === 'folder',
      node,
      children: [],
    })

    if (node.children.length > 0) {
      result.push(...toSortableTree(node.children, node.id))
    }
  }

  return result
}

/**
 * Converts a flat SidebarTreeItem[] back to nested TreeNode[].
 * Reconstructs the tree hierarchy based on parentId relationships.
 */
export function fromSortableTree(items: SidebarTreeItem[]): TreeNode[] {
  if (items.length === 0) return []

  // Build a map of id -> item for quick lookup
  const itemMap = new Map<UniqueIdentifier, SidebarTreeItem>()
  items.forEach(item => itemMap.set(item.id, item))

  // Build a map of parentId -> children
  const childrenMap = new Map<UniqueIdentifier | null, TreeNode[]>()

  for (const item of items) {
    const node: TreeNode = {
      ...item.node,
      children: [],
    }

    if (!childrenMap.has(item.parentId)) {
      childrenMap.set(item.parentId, [])
    }
    childrenMap.get(item.parentId)!.push(node)
  }

  // Recursively build the tree
  function buildChildren(parentId: UniqueIdentifier | null): TreeNode[] {
    const children = childrenMap.get(parentId) || []
    for (const child of children) {
      child.children = buildChildren(child.id)
    }
    return children
  }

  return buildChildren(null)
}
