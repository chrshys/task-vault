import { useState, useRef, useEffect } from 'react'
import type { RepeatConfig, RepeatFrequency, RepeatFrom } from '@shared/types'
import { REMINDER_OFFSETS } from '@shared/types'

interface DueDatePickerProps {
  dueDate: Date | null
  repeat: RepeatConfig | null
  reminders: number[]
  onDateChange: (date: Date | null) => void
  onRepeatChange: (repeat: RepeatConfig | null) => void
  onRemindersChange: (reminders: number[]) => void
}

const frequencies: { value: RepeatFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function DueDatePicker({
  dueDate,
  repeat,
  reminders,
  onDateChange,
  onRepeatChange,
  onRemindersChange,
}: DueDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => dueDate || new Date())
  const [timeExpanded, setTimeExpanded] = useState(false)
  const [repeatExpanded, setRepeatExpanded] = useState(false)
  const [reminderExpanded, setReminderExpanded] = useState(false)
  const [prevDueDate, setPrevDueDate] = useState(dueDate)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract time from dueDate
  const hasTime = dueDate ? (dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0) : false
  const hours24 = dueDate?.getHours() ?? 9
  const minutes = dueDate?.getMinutes() ?? 0

  // Convert to 12-hour format
  const isPM = hours24 >= 12
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24

  // Sync viewDate when dueDate changes
  if (dueDate !== prevDueDate) {
    setPrevDueDate(dueDate)
    if (dueDate) {
      setViewDate(dueDate)
    }
  }

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const dropdownWidth = 320 // w-80 = 20rem = 320px
      const padding = 8

      // Check if right-aligned dropdown would overflow left edge
      if (rect.right < dropdownWidth + padding) {
        // Position from left instead
        setDropdownPosition({
          top: rect.bottom + 4,
          left: Math.max(padding, rect.left),
        })
      } else {
        setDropdownPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        })
      }
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const setDateWithTime = (date: Date, time: { hours: number; minutes: number } | null) => {
    const newDate = new Date(date)
    if (time) {
      newDate.setHours(time.hours, time.minutes, 0, 0)
    } else {
      newDate.setHours(0, 0, 0, 0)
    }
    onDateChange(newDate)
  }

  const handleQuickSelect = (type: 'today' | 'tomorrow' | 'week' | 'evening') => {
    const now = new Date()
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)

    switch (type) {
      case 'today':
        onDateChange(date)
        break
      case 'tomorrow':
        date.setDate(date.getDate() + 1)
        onDateChange(date)
        break
      case 'week':
        date.setDate(date.getDate() + 7)
        onDateChange(date)
        break
      case 'evening': {
        const eveningDate = dueDate ? new Date(dueDate) : date
        eveningDate.setHours(18, 0, 0, 0)
        onDateChange(eveningDate)
        break
      }
    }
  }

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    if (hasTime && dueDate) {
      newDate.setHours(dueDate.getHours(), dueDate.getMinutes(), 0, 0)
    }
    onDateChange(newDate)
  }

  const handleTimeChange = (newHours12: number, newMinutes: number, newIsPM: boolean) => {
    // Convert 12-hour to 24-hour format
    let newHours24 = newHours12
    if (newHours12 === 12) {
      newHours24 = newIsPM ? 12 : 0
    } else {
      newHours24 = newIsPM ? newHours12 + 12 : newHours12
    }

    if (!dueDate) {
      const today = new Date()
      today.setHours(newHours24, newMinutes, 0, 0)
      onDateChange(today)
    } else {
      setDateWithTime(dueDate, { hours: newHours24, minutes: newMinutes })
    }
  }

  const handleClearTime = () => {
    if (dueDate) {
      setDateWithTime(dueDate, null)
    }
  }

  const handleReminderToggle = (offset: number) => {
    if (reminders.includes(offset)) {
      onRemindersChange(reminders.filter(r => r !== offset))
    } else {
      onRemindersChange([...reminders, offset].sort((a, b) => a - b))
    }
  }

  const handleClearReminders = () => {
    onRemindersChange([])
  }

  const handleFrequencyChange = (frequency: RepeatFrequency) => {
    onRepeatChange({
      frequency,
      interval: repeat?.interval || 1,
      from: repeat?.from || 'due_date',
    })
  }

  const handleIntervalChange = (interval: number) => {
    if (!repeat) return
    onRepeatChange({ ...repeat, interval: Math.max(1, interval) })
  }

  const handleFromChange = (from: RepeatFrom) => {
    if (!repeat) return
    onRepeatChange({ ...repeat, from })
  }

  const handleClear = () => {
    onDateChange(null)
    onRepeatChange(null)
    setIsOpen(false)
  }

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setViewDate(new Date())
  }

  const getDisplayText = (): string => {
    if (!dueDate) return 'Add due date'

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

    let dateText: string
    if (dueDateOnly.getTime() === today.getTime()) {
      dateText = 'Today'
    } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
      dateText = 'Tomorrow'
    } else {
      dateText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (hasTime) {
      const timeText = dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      dateText += ` ${timeText}`
    }

    if (repeat) {
      const freqText = repeat.interval > 1
        ? `Every ${repeat.interval} ${repeat.frequency.replace('ly', '')}s`
        : repeat.frequency.charAt(0).toUpperCase() + repeat.frequency.slice(1)
      dateText += `, ${freqText}`
    }

    return dateText
  }

  // Calendar rendering
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  const todayDate = today.getDate()
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()

  const selectedDay = dueDate?.getDate()
  const selectedMonth = dueDate?.getMonth()
  const selectedYear = dueDate?.getFullYear()

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = []

  // Previous month days
  for (let i = 0; i < firstDay; i++) {
    week.push(-(daysInPrevMonth - firstDay + 1 + i))
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  // Next month days
  while (week.length < 7 && week.length > 0) {
    week.push(null)
  }
  if (week.length > 0) {
    weeks.push(week)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-colors ${
          dueDate
            ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span>{dueDate ? getDisplayText() : 'Due date'}</span>
      </button>

      {isOpen && dropdownPosition && (
        <div className="fixed z-[100] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          right: dropdownPosition.right,
        }}>
          {/* Quick shortcuts */}
          <div className="flex justify-around p-3 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleQuickSelect('today')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Today"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('tomorrow')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Tomorrow"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('week')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="In 7 days"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium border border-gray-400 dark:border-gray-500 rounded text-gray-600 dark:text-gray-400">+7</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('evening')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Evening (6 PM)"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
          </div>

          {/* Calendar header */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 px-3 text-center text-xs text-gray-500 dark:text-gray-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="px-3 pb-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 text-center">
                {week.map((day, di) => {
                  if (day === null) {
                    // Next month placeholder
                    return <div key={di} className="py-1 text-sm text-gray-300 dark:text-gray-600" />
                  }
                  if (day < 0) {
                    // Previous month day
                    return (
                      <div key={di} className="py-1 text-sm text-gray-300 dark:text-gray-600">
                        {Math.abs(day)}
                      </div>
                    )
                  }

                  const isToday = day === todayDate && month === todayMonth && year === todayYear
                  const isSelected = day === selectedDay && month === selectedMonth && year === selectedYear

                  return (
                    <button
                      key={di}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`py-1 text-sm rounded-full w-8 h-8 mx-auto transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isToday
                          ? 'border border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Time section */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setTimeExpanded(!timeExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">Time</span>
                {hasTime && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {dueDate?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${timeExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {timeExpanded && (
              <div className="px-4 pb-3 flex items-center gap-2">
                <select
                  value={hours12}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value), minutes, isPM)}
                  className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                >
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">:</span>
                <select
                  value={Math.floor(minutes / 15) * 15}
                  onChange={(e) => handleTimeChange(hours12, parseInt(e.target.value), isPM)}
                  className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  value={isPM ? 'PM' : 'AM'}
                  onChange={(e) => handleTimeChange(hours12, minutes, e.target.value === 'PM')}
                  className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
                {hasTime && (
                  <button
                    type="button"
                    onClick={handleClearTime}
                    className="ml-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Reminder section - only show when time is set */}
          {hasTime && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setReminderExpanded(!reminderExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Remind me</span>
                  {reminders.length > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {reminders.length} set
                    </span>
                  )}
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${reminderExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {reminderExpanded && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_OFFSETS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleReminderToggle(value)}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                          reminders.includes(value)
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {reminders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearReminders}
                      className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Repeat section */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setRepeatExpanded(!repeatExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">Repeat</span>
                {repeat && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {repeat.interval > 1 ? `Every ${repeat.interval} ${repeat.frequency.replace('ly', '')}s` : repeat.frequency}
                  </span>
                )}
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${repeatExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {repeatExpanded && (
              <div className="px-4 pb-3 space-y-3">
                <div className="flex gap-1 flex-wrap">
                  {frequencies.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleFrequencyChange(f.value)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        repeat?.frequency === f.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {repeat && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Every</span>
                      <input
                        type="number"
                        min={1}
                        value={repeat.interval}
                        onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {repeat.frequency === 'daily' && (repeat.interval > 1 ? 'days' : 'day')}
                        {repeat.frequency === 'weekly' && (repeat.interval > 1 ? 'weeks' : 'week')}
                        {repeat.frequency === 'monthly' && (repeat.interval > 1 ? 'months' : 'month')}
                        {repeat.frequency === 'yearly' && (repeat.interval > 1 ? 'years' : 'year')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">From</span>
                      <select
                        value={repeat.from}
                        onChange={(e) => handleFromChange(e.target.value as RepeatFrom)}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                      >
                        <option value="due_date">Due date</option>
                        <option value="completion_date">Completion date</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRepeatChange(null)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      No repeat
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
