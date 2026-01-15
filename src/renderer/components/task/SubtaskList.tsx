import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VaultTask, TaskMeta, RepeatConfig } from '@shared/types'
import { useVault } from '../../contexts/VaultContext'
import { DueDatePicker } from '../ui/DueDatePicker'

interface SubtaskListProps {
  parentId: string
}

export function SubtaskList({ parentId }: SubtaskListProps) {
  const { getSubtasks, createSubtask, updateItem } = useVault()
  const [newSubtask, setNewSubtask] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null)
  const [selectedRepeat, setSelectedRepeat] = useState<RepeatConfig | null>(null)
  const [recentlyCreatedId, setRecentlyCreatedId] = useState<string | null>(null)
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const subtasks = getSubtasks(parentId)

  // Clear the recently created ID after animation completes
  const clearRecentlyCreated = useCallback(() => {
    const timer = setTimeout(() => setRecentlyCreatedId(null), 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (recentlyCreatedId) {
      return clearRecentlyCreated()
    }
  }, [recentlyCreatedId, clearRecentlyCreated])

  const handleAdd = async () => {
    if (!newSubtask.trim()) return
    const newItem = await createSubtask(parentId, newSubtask.trim(), selectedDueDate, selectedRepeat)
    if (newItem) {
      setRecentlyCreatedId(newItem.id)
    }
    setNewSubtask('')
    setSelectedDueDate(null)
    setSelectedRepeat(null)
    setIsInputFocused(false)
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    if (inputWrapperRef.current?.contains(e.relatedTarget as Node)) return
    if (newSubtask.trim()) return
    setIsInputFocused(false)
  }

  const handleToggle = async (subtask: VaultTask) => {
    await updateItem({
      ...subtask,
      meta: {
        ...subtask.meta,
        status: subtask.meta.status === 'completed' ? 'pending' : 'completed',
        completed_at: subtask.meta.status === 'pending' ? new Date().toISOString() : undefined,
      } as TaskMeta,
    })
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Subtasks ({subtasks.length})
      </h4>

      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {subtasks.map(subtask => {
            const isCompleted = subtask.meta.status === 'completed'
            const isNew = subtask.id === recentlyCreatedId
            return (
              <motion.div
                key={subtask.id}
                layout
                initial={isNew ? { opacity: 0, height: 0, backgroundColor: 'rgba(59, 130, 246, 0.15)' } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', backgroundColor: 'rgba(0, 0, 0, 0)' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  layout: { type: 'spring', stiffness: 400, damping: 30 },
                  opacity: { duration: 0.15 },
                  height: { type: 'spring', stiffness: 400, damping: 30 },
                  backgroundColor: { duration: 0.8, delay: 0.1 }
                }}
                className="flex items-start gap-2 rounded px-1 -mx-1 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(subtask)}
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded border flex items-center justify-center ${
                    isCompleted
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-500 hover:border-blue-500'
                  }`}
                >
                  {isCompleted && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm break-words ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {subtask.title}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div
        ref={inputWrapperRef}
        className={`mt-2 rounded-lg border transition-colors ${
          isInputFocused || newSubtask
            ? 'border-blue-500 bg-gray-100 dark:bg-gray-700/50'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={handleInputBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add subtask..."
          className="w-full px-3 py-2 bg-transparent rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
        />

        {/* Control Ribbon */}
        {(isInputFocused || newSubtask) && (
          <div className="flex items-center justify-between px-2 py-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-1">
              <DueDatePicker
                dueDate={selectedDueDate}
                repeat={selectedRepeat}
                reminders={[]}
                onDateChange={setSelectedDueDate}
                onRepeatChange={setSelectedRepeat}
                onRemindersChange={() => {}}
              />
              <button
                type="button"
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                title="More options"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={!newSubtask.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
