import { useState } from 'react'
import type { RepeatConfig, RepeatFrequency, RepeatFrom } from '@shared/types'

interface RecurrencePickerProps {
  value: RepeatConfig | null | undefined
  onChange: (config: RepeatConfig | null) => void
}

const frequencies: { value: RepeatFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleFrequencyChange = (frequency: RepeatFrequency) => {
    onChange({
      frequency,
      interval: value?.interval || 1,
      from: value?.from || 'due_date',
    })
  }

  const handleIntervalChange = (interval: number) => {
    if (!value) return
    onChange({ ...value, interval: Math.max(1, interval) })
  }

  const handleFromChange = (from: RepeatFrom) => {
    if (!value) return
    onChange({ ...value, from })
  }

  const handleClear = () => {
    onChange(null)
    setIsOpen(false)
  }

  const getLabel = (): string => {
    if (!value) return 'No repeat'
    const intervalText = value.interval > 1 ? ` every ${value.interval}` : ''
    const freqText = value.frequency.charAt(0).toUpperCase() + value.frequency.slice(1)
    return `${freqText}${intervalText}`
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm border border-gray-600 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600"
      >
        {getLabel()}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-10 w-64 p-3 bg-gray-700 rounded-md shadow-lg border border-gray-600">
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Frequency</label>
            <div className="flex gap-1 flex-wrap">
              {frequencies.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleFrequencyChange(f.value)}
                  className={`px-2 py-1 text-xs rounded ${
                    value?.frequency === f.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {value && (
            <>
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Every</label>
                <input
                  type="number"
                  min={1}
                  value={value.interval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-gray-200"
                />
                <span className="ml-2 text-sm text-gray-300">
                  {value.frequency === 'daily' && (value.interval > 1 ? 'days' : 'day')}
                  {value.frequency === 'weekly' && (value.interval > 1 ? 'weeks' : 'week')}
                  {value.frequency === 'monthly' && (value.interval > 1 ? 'months' : 'month')}
                  {value.frequency === 'yearly' && (value.interval > 1 ? 'years' : 'year')}
                </span>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Repeat from</label>
                <select
                  value={value.from}
                  onChange={(e) => handleFromChange(e.target.value as RepeatFrom)}
                  className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-gray-200"
                >
                  <option value="due_date">Due date</option>
                  <option value="completion_date">Completion date</option>
                </select>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500"
            >
              No repeat
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
