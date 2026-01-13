import { describe, it, expect } from 'vitest'
import { toSortableTree, fromSortableTree } from './sidebarTreeAdapter'
import type { TreeNode } from '@shared/types'

describe('sidebarTreeAdapter', () => {
  const mockTree: TreeNode[] = [
    {
      id: 'folder-1',
      name: 'Work',
      type: 'folder',
      path: '/vault/Work',
      children: [
        { id: 'proj-1', name: 'Project A', type: 'project', path: '/vault/Work/Project A', children: [], count: 3 }
      ],
      count: 3
    },
    { id: 'proj-2', name: 'Personal', type: 'project', path: '/vault/Personal', children: [], count: 5 }
  ]

  describe('toSortableTree', () => {
    it('converts TreeNode[] to flat sortable tree items', () => {
      const result = toSortableTree(mockTree)
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ id: 'folder-1', parentId: null, canHaveChildren: true })
      expect(result[1]).toMatchObject({ id: 'proj-1', parentId: 'folder-1', canHaveChildren: false })
      expect(result[2]).toMatchObject({ id: 'proj-2', parentId: null, canHaveChildren: false })
    })

    it('preserves original node data', () => {
      const result = toSortableTree(mockTree)
      expect(result[0].node.name).toBe('Work')
      expect(result[0].node.path).toBe('/vault/Work')
    })

    it('handles empty tree', () => {
      const result = toSortableTree([])
      expect(result).toHaveLength(0)
    })

    it('handles deeply nested folders', () => {
      const deepTree: TreeNode[] = [
        {
          id: 'f1',
          name: 'Level 1',
          type: 'folder',
          path: '/vault/Level 1',
          children: [
            {
              id: 'f2',
              name: 'Level 2',
              type: 'folder',
              path: '/vault/Level 1/Level 2',
              children: [
                { id: 'p1', name: 'Deep Project', type: 'project', path: '/vault/Level 1/Level 2/Deep Project', children: [] }
              ]
            }
          ]
        }
      ]
      const result = toSortableTree(deepTree)
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ id: 'f1', parentId: null })
      expect(result[1]).toMatchObject({ id: 'f2', parentId: 'f1' })
      expect(result[2]).toMatchObject({ id: 'p1', parentId: 'f2' })
    })
  })

  describe('fromSortableTree', () => {
    it('converts flat items back to nested TreeNode[]', () => {
      const flat = toSortableTree(mockTree)
      const result = fromSortableTree(flat)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('folder-1')
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].id).toBe('proj-1')
      expect(result[1].id).toBe('proj-2')
    })

    it('handles empty array', () => {
      const result = fromSortableTree([])
      expect(result).toHaveLength(0)
    })

    it('preserves node data through round trip', () => {
      const flat = toSortableTree(mockTree)
      const result = fromSortableTree(flat)
      expect(result[0].name).toBe('Work')
      expect(result[0].path).toBe('/vault/Work')
      expect(result[0].count).toBe(3)
    })
  })
})
