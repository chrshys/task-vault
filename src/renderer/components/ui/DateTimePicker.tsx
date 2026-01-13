import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface DateTimePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  showTimeSelect?: boolean
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  showTimeSelect = true,
  className = '',
}: DateTimePickerProps) {
  return (
    <DatePicker
      selected={value}
      onChange={onChange}
      showTimeSelect={showTimeSelect}
      timeFormat="HH:mm"
      timeIntervals={15}
      dateFormat="MMM d, yyyy h:mm aa"
      placeholderText={placeholder}
      className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      calendarClassName="dark:bg-gray-800"
      isClearable
    />
  )
}
