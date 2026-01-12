import { useEffect, useState } from 'react'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { UIProvider } from './contexts/UIContext'
import { Welcome } from './components/Welcome'
import type { AppSettings } from '@shared/types'

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

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      <div className="w-64 border-r border-gray-700 p-4">
        Sidebar placeholder
      </div>
      <div className="flex-1 p-4">
        Main content placeholder
      </div>
    </div>
  )
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
