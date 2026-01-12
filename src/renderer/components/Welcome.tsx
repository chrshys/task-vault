import { useVault } from '../contexts/VaultContext'

export function Welcome() {
  const { initializeVault, loadVault } = useVault()

  const handleCreate = async () => {
    const folderPath = await window.api.selectVaultFolder()
    if (folderPath) {
      await initializeVault(folderPath)
    }
  }

  const handleOpen = async () => {
    const folderPath = await window.api.selectVaultFolder()
    if (folderPath) {
      await loadVault(folderPath)
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-8 bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">TaskVault</h1>
        <p className="text-gray-400">
          A task manager with local markdown storage
        </p>
      </div>

      <div className="flex flex-col gap-4 w-64">
        <button
          onClick={handleCreate}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Create New Vault
        </button>
        <button
          onClick={handleOpen}
          className="px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
        >
          Open Existing Vault
        </button>
      </div>
    </div>
  )
}
