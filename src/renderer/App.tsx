import { useEffect, useState } from 'react'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider, useUI } from './contexts/UIContext'
import { DndProvider } from './contexts/DndContext'
import { HistoryProvider } from './contexts/HistoryContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Welcome } from './components/Welcome'
import { TitleBar } from './components/layout/TitleBar'
import { Sidebar } from './components/layout/Sidebar'
import { TaskList } from './components/layout/TaskList'
import { TaskDetail } from './components/layout/TaskDetail'
import { NoteDetail } from './components/layout/NoteDetail'
import { QuickAddModal } from './components/ui/QuickAddModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { AppSettings, VaultNote } from '@shared/types'

function MainLayout() {
  const { selectedTaskId, sidebarCollapsed, showQuickAdd, quickAddType, closeQuickAdd } = useUI()
  const { items } = useVault()
  useKeyboardShortcuts()

  const selectedItem = selectedTaskId ? items.get(selectedTaskId) : null
  const isNote = selectedItem?.meta.type === 'note'

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <div
          className={`${
            sidebarCollapsed ? 'w-14' : 'w-64'
          } border-r border-gray-200 dark:border-gray-700 flex-shrink-0 transition-[width] duration-200`}
        >
          <Sidebar />
        </div>
        <div className="flex-1 flex min-w-0">
          <div
            className={`${
              selectedTaskId ? 'w-2/5' : 'flex-1'
            } min-w-[320px] border-r border-gray-200 dark:border-gray-700 overflow-hidden`}
          >
            <TaskList />
          </div>
          {selectedTaskId && (
            <div className="flex-1 min-w-[360px] overflow-hidden">
              {isNote ? (
                <NoteDetail note={selectedItem as VaultNote} />
              ) : (
                <TaskDetail />
              )}
            </div>
          )}
        </div>
      </div>
      {showQuickAdd && (
        <QuickAddModal type={quickAddType} onClose={closeQuickAdd} />
      )}
    </div>
  )
}

function AppContent() {
  const { vaultPath, loadVault, loading } = useVault()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const settings: AppSettings = await window.api.getSettings()
      if (settings.vaultPath) {
        await loadVault(settings.vaultPath)
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
      <DndProvider>
        <MainLayout />
      </DndProvider>
    </HistoryProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <VaultProvider>
        <UIProvider>
          <AppContent />
        </UIProvider>
      </VaultProvider>
    </ThemeProvider>
  )
}
