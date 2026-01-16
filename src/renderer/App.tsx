import { useEffect, useState } from 'react'
import path from 'path-browserify'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider, useUI } from './contexts/UIContext'
import { TreeDndProvider } from './contexts/TreeDndContext'
import { HistoryProvider } from './contexts/HistoryContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Welcome } from './components/Welcome'
import { TitleBar } from './components/layout/TitleBar'
import { ResizablePanelLayout } from './components/layout/ResizablePanelLayout'
import { QuickAddModal } from './components/ui/QuickAddModal'
import { ConflictDialog } from './components/ui/ConflictDialog'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { AppSettings } from '@shared/types'

function MainLayout() {
  const { showQuickAdd, quickAddType, closeQuickAdd, layoutMode } = useUI()
  useKeyboardShortcuts()

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {layoutMode !== 'mobile' && <TitleBar />}
      <TreeDndProvider>
        <div className="flex-1 flex min-h-0">
          <ResizablePanelLayout />
        </div>
      </TreeDndProvider>
      {showQuickAdd && (
        <QuickAddModal type={quickAddType} onClose={closeQuickAdd} />
      )}
    </div>
  )
}

function ReminderHandler() {
  const { setSelectedView, setSelectedTaskId } = useUI()
  const { items, vaultPath } = useVault()

  useEffect(() => {
    const unsubscribe = window.api.onReminderClicked(({ taskId }) => {
      const task = items.get(taskId)
      if (!task) return

      // Determine which view to show
      const taskDir = path.dirname(task.path)
      const inboxPath = vaultPath ? path.join(vaultPath, 'Inbox') : null

      if (inboxPath && taskDir === inboxPath) {
        setSelectedView('inbox')
      } else {
        setSelectedView('project', taskDir)
      }

      // Select the task after a tick to ensure view is set
      setTimeout(() => setSelectedTaskId(taskId), 0)
    })

    return unsubscribe
  }, [items, vaultPath, setSelectedView, setSelectedTaskId])

  return null
}

function AppContent() {
  const { vaultPath, loadVault, loading, conflictDialogProps } = useVault()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const settings: AppSettings = await window.api.getSettings()
      if (settings.vaultPath) {
        try {
          await loadVault(settings.vaultPath)
        } catch (err) {
          // Vault folder no longer exists - clear it from settings
          console.error('Failed to load vault:', err)
          await window.api.setSettings({ ...settings, vaultPath: null })
        }
      }
      setInitialized(true)
    }
    init()
  }, [loadVault])

  if (!initialized || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!vaultPath) {
    return <Welcome />
  }

  return (
    <HistoryProvider>
      <ReminderHandler />
      <MainLayout />
      {conflictDialogProps && <ConflictDialog {...conflictDialogProps} />}
    </HistoryProvider>
  )
}

function AppWithUI() {
  const { vaultPath } = useVault()
  return (
    <UIProvider vaultPath={vaultPath}>
      <AppContent />
    </UIProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <VaultProvider>
        <AppWithUI />
      </VaultProvider>
    </ThemeProvider>
  )
}
