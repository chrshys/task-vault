import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { VaultItem, VaultTask, TreeNode, ItemType, TaskMeta } from '@shared/types'
import path from 'path-browserify'

interface VaultContextValue {
  items: Map<string, VaultItem>
  tree: TreeNode[]
  loading: boolean
  vaultPath: string | null
  loadVault: (path: string) => Promise<void>
  initializeVault: (path: string) => Promise<void>
  createItem: (type: ItemType, folder: string, title: string) => Promise<VaultItem>
  updateItem: (item: VaultItem) => Promise<void>
  deleteItem: (path: string) => Promise<void>
  duplicateItem: (item: VaultItem) => Promise<VaultItem>
  convertItem: (item: VaultItem, toType: 'task' | 'note') => Promise<void>
  createFolder: (name: string, parentPath?: string) => Promise<VaultItem>
  getItemsByParent: (parentId: string | null) => VaultItem[]
  getTodayTasks: () => VaultItem[]
  getNext7DaysTasks: () => VaultItem[]
  getInboxItems: () => VaultItem[]
  createSubtask: (parentId: string, title: string) => Promise<VaultItem | null>
  getSubtasks: (parentId: string) => VaultTask[]
}

const VaultContext = createContext<VaultContextValue | null>(null)

function buildTree(items: Map<string, VaultItem>, vaultPath: string): TreeNode[] {
  const tree: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()

  items.forEach((item) => {
    if (item.meta.type === 'folder' || item.meta.type === 'project') {
      const dirPath = path.dirname(item.path)
      const node: TreeNode = {
        id: item.id,
        name: item.title,
        type: item.meta.type,
        path: dirPath,
        children: [],
        count: 0,
      }
      folderMap.set(dirPath, node)
    }
  })

  items.forEach((item) => {
    if (item.meta.type === 'task' || item.meta.type === 'note') {
      const dirPath = path.dirname(item.path)
      const parentNode = folderMap.get(dirPath)
      if (parentNode) {
        parentNode.count = (parentNode.count || 0) + 1
      }
    }
  })

  folderMap.forEach((node, nodePath) => {
    const parentPath = path.dirname(nodePath)
    const parentNode = folderMap.get(parentPath)

    if (parentNode && parentPath !== nodePath) {
      parentNode.children.push(node)
    } else if (nodePath !== vaultPath) {
      tree.push(node)
    }
  })

  return tree.sort((a, b) => a.name.localeCompare(b.name))
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, VaultItem>>(new Map())
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)

  const rebuildTree = useCallback((itemsMap: Map<string, VaultItem>, vault: string) => {
    setTree(buildTree(itemsMap, vault))
  }, [])

  const loadVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.loadVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap, folderPath)
    setLoading(false)
  }, [rebuildTree])

  const initializeVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.initializeVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap, folderPath)
    setLoading(false)
  }, [rebuildTree])

  const createItem = useCallback(async (type: ItemType, folder: string, title: string) => {
    const item = await window.api.createFile(type, folder, title)
    setItems(prev => {
      const next = new Map(prev)
      next.set(item.id, item)
      if (vaultPath) rebuildTree(next, vaultPath)
      return next
    })
    return item
  }, [vaultPath, rebuildTree])

  const updateItem = useCallback(async (item: VaultItem) => {
    await window.api.writeFile(item.path, item)
  }, [])

  const deleteItem = useCallback(async (itemPath: string) => {
    await window.api.deleteFile(itemPath)
  }, [])

  const duplicateItem = useCallback(async (item: VaultItem) => {
    const folder = path.dirname(item.path)
    const newTitle = `${item.title} (copy)`
    const newItem = await createItem(item.meta.type as ItemType, folder, newTitle)
    const duplicated: VaultItem = {
      ...newItem,
      content: item.content,
      meta: { ...item.meta, created: new Date().toISOString(), modified: new Date().toISOString() },
    }
    await updateItem(duplicated)
    return duplicated
  }, [createItem, updateItem])

  const convertItem = useCallback(async (item: VaultItem, toType: 'task' | 'note') => {
    if (item.meta.type === toType) return

    const newMeta = toType === 'task'
      ? { ...item.meta, type: 'task' as const, status: 'pending' as const, due: undefined }
      : { ...item.meta, type: 'note' as const, status: undefined, due: undefined }

    await updateItem({ ...item, meta: newMeta })
  }, [updateItem])

  const createFolder = useCallback(async (name: string, parentPath?: string) => {
    const basePath = parentPath || vaultPath
    if (!basePath) throw new Error('No vault path set')
    return createItem('folder', basePath, name)
  }, [vaultPath, createItem])

  const getItemsByParent = useCallback((parentId: string | null) => {
    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'task' || item.meta.type === 'note') {
        return item.meta.parent === parentId
      }
      return false
    })
  }, [items])

  const getTodayTasks = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      if (item.meta.status === 'completed') return false
      if (!item.meta.due) return false
      const due = new Date(item.meta.due)
      return due >= today && due < tomorrow
    })
  }, [items])

  const getNext7DaysTasks = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)

    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      if (item.meta.status === 'completed') return false
      if (!item.meta.due) return false
      const due = new Date(item.meta.due)
      return due >= today && due < next7
    })
  }, [items])

  const getInboxItems = useCallback(() => {
    if (!vaultPath) return []
    const inboxPath = path.join(vaultPath, 'Inbox')

    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'folder' || item.meta.type === 'project') return false
      return item.path.startsWith(inboxPath)
    })
  }, [items, vaultPath])

  const getSubtasks = useCallback((parentId: string): VaultTask[] => {
    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      return (item.meta as TaskMeta).parent === parentId
    }) as VaultTask[]
  }, [items])

  const createSubtask = useCallback(async (parentId: string, title: string): Promise<VaultItem | null> => {
    const parent = items.get(parentId)
    if (!parent || parent.meta.type !== 'task') return null

    const folder = path.dirname(parent.path)
    const newItem = await createItem('task', folder, title)

    if (newItem) {
      const updatedItem: VaultItem = {
        ...newItem,
        meta: { ...newItem.meta, parent: parentId } as TaskMeta,
      }
      await updateItem(updatedItem)
      return updatedItem
    }
    return null
  }, [items, createItem, updateItem])

  useEffect(() => {
    const unsubChanged = window.api.onFileChanged((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        if (vaultPath) rebuildTree(next, vaultPath)
        return next
      })
    })

    const unsubAdded = window.api.onFileAdded((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        if (vaultPath) rebuildTree(next, vaultPath)
        return next
      })
    })

    const unsubDeleted = window.api.onFileDeleted((deletedPath) => {
      setItems(prev => {
        const next = new Map(prev)
        for (const [id, item] of next) {
          if (item.path === deletedPath) {
            next.delete(id)
            break
          }
        }
        if (vaultPath) rebuildTree(next, vaultPath)
        return next
      })
    })

    return () => {
      unsubChanged()
      unsubAdded()
      unsubDeleted()
    }
  }, [vaultPath, rebuildTree])

  return (
    <VaultContext.Provider
      value={{
        items,
        tree,
        loading,
        vaultPath,
        loadVault,
        initializeVault,
        createItem,
        updateItem,
        deleteItem,
        duplicateItem,
        convertItem,
        createFolder,
        getItemsByParent,
        getTodayTasks,
        getNext7DaysTasks,
        getInboxItems,
        createSubtask,
        getSubtasks,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}
