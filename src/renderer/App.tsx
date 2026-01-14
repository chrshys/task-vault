import { useEffect, useState } from 'react'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider, useUI } from './contexts/UIContext'
import { TreeDndProvider } from './contexts/TreeDndContext'
import { HistoryProvider } from './contexts/HistoryContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Welcome } from './components/Welcome'
import { TitleBar } from './components/layout/TitleBar'
import { ResizablePanelLayout } from './components/layout/ResizablePanelLayout'
import { QuickAddModal } from './components/ui/QuickAddModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { AppSettings } from '@shared/types'

function MainLayout() {
  const { showQuickAdd, quickAddType, closeQuickAdd } = useUI()
  useKeyboardShortcuts()

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <TitleBar />
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
      <MainLayout />
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
