import { useEffect, useState } from 'react'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider, useUI } from './contexts/UIContext'
import { Welcome } from './components/Welcome'
import { Sidebar } from './components/layout/Sidebar'
import { TaskList } from './components/layout/TaskList'
import { TaskDetail } from './components/layout/TaskDetail'
import type { AppSettings } from '@shared/types'

function MainLayout() {
  const { selectedTaskId } = useUI()

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      <div className="w-64 border-r border-gray-700 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex">
        <div className={`${selectedTaskId ? 'w-1/2' : 'flex-1'} border-r border-gray-700`}>
          <TaskList />
        </div>
        {selectedTaskId && (
          <div className="w-1/2">
            <TaskDetail />
          </div>
        )}
      </div>
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
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!vaultPath) {
    return <Welcome />
  }

  return <MainLayout />
}

export default function App() {
  return (
    <VaultProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </VaultProvider>
  )
}
