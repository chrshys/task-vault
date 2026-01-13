import { useTheme } from '../../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded text-sm ${theme === 'light' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        title="Light mode"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded text-sm ${theme === 'dark' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        title="Dark mode"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded text-sm ${theme === 'system' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        title="System preference"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.321a.75.75 0 01-.557 1.392l-1.395-.558a.75.75 0 01-.457-.456L11 14h-2l-.298 1.188a.75.75 0 01-.457.456l-1.395.558a.75.75 0 11-.557-1.392l.804-.32L7.22 14H5a2 2 0 01-2-2V5zm2 0h10v8H5V5z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
