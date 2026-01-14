import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron IPC
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

// Mock window.api for renderer tests
Object.defineProperty(window, 'api', {
  value: {
    loadVault: vi.fn(),
    initializeVault: vi.fn(),
    getVaultConfig: vi.fn(),
    setVaultConfig: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    createFile: vi.fn(),
    deleteFile: vi.fn(),
    moveFile: vi.fn(),
    selectFolder: vi.fn(),
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    onFileChange: vi.fn(() => vi.fn()),
  },
  writable: true,
})
