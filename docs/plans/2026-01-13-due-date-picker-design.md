# Due Date Picker Design

TickTick-style unified date picker replacing separate DateTimePicker and RecurrencePicker.

## Component: `DueDatePicker`

### Props
```typescript
interface DueDatePickerProps {
  dueDate: Date | null
  repeat: RepeatConfig | null
  onDateChange: (date: Date | null) => void
  onRepeatChange: (repeat: RepeatConfig | null) => void
}
```

### Trigger Button
Smart summary display:
- "Today 2:00 PM"
- "Tomorrow"
- "Jan 15, Daily"
- "No date" (placeholder)

### Dropdown Layout

**Quick shortcuts (top bar, 4 icon buttons):**
| Icon | Action |
|------|--------|
| ☀️ Today | Set date to today, clear time |
| 🏠 Tomorrow | Set date to tomorrow, clear time |
| +7 | Set date to 7 days from now, clear time |
| 🌙 Evening | Keep/set today, set time to 6:00 PM |

**Calendar:**
- Month/year header with prev/next arrows and today button
- 7-column grid (S M T W T F S)
- Selected day filled, today highlighted
- Adjacent month days muted

**Collapsible sections:**
- **Time** - expands to hour/minute selection
- **Repeat** - expands to frequency, interval, repeat-from controls

**Footer:**
- Clear (left) - clears date, time, repeat; closes dropdown
- OK (right, primary) - closes dropdown

### Behavior
- Changes apply immediately (no draft state)
- Closes on OK, Clear, or outside click
- Time null = date only display; time set = includes time in display

## Integration

**TaskDetail.tsx:**
Replace:
```tsx
<DateTimePicker ... />
<RecurrencePicker ... />
```
With:
```tsx
<DueDatePicker
  dueDate={due ? new Date(due) : null}
  repeat={repeat}
  onDateChange={(date) => handleDueChange(date?.toISOString() || '')}
  onRepeatChange={handleRepeatChange}
/>
```

## Files
- Create: `src/renderer/components/ui/DueDatePicker.tsx`
- Modify: `src/renderer/components/layout/TaskDetail.tsx`
- Delete: `src/renderer/components/ui/DateTimePicker.tsx` (after migration)
- Keep: `RecurrencePicker.tsx` may be deleted if fully absorbed
