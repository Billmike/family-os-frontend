import { useMemo, useState } from 'react'
import { Calendar, Check, Sofa, Sun, X } from 'lucide-react'
import {
  addDays,
  calendarMonthsInRange,
  clampDueDate,
  daysInMonth,
  monthYearLabel,
  nextWeekMonday,
  TASK_DUE_MAX_DAYS,
  thisWeekendDate,
  weekdayShort,
} from '../api/adapters'
import { BottomSheet, t, r } from '../ui'
import { CalendarDayCell } from './CalendarDayCell'

interface Props {
  today: string
  initialDate: string | null
  onClose: () => void
  onConfirm: (date: string) => void
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const QUICK_PICKS = [
  { id: 'today', label: 'Today', icon: Calendar, color: t.success, getDate: (today: string) => today },
  { id: 'tomorrow', label: 'Tomorrow', icon: Sun, color: t.warning, getDate: (today: string) => addDays(today, 1) },
  { id: 'weekend', label: 'This Weekend', icon: Sofa, color: t.info, getDate: thisWeekendDate },
  { id: 'nextWeek', label: 'Next Week', icon: Calendar, color: 'var(--ds-member-6)', getDate: nextWeekMonday },
] as const

export default function TaskDateSheet({ today, initialDate, onClose, onConfirm }: Props) {
  const maxDate = addDays(today, TASK_DUE_MAX_DAYS)
  const [selected, setSelected] = useState<string | null>(() =>
    initialDate ? clampDueDate(initialDate, today) : null,
  )

  const months = useMemo(() => calendarMonthsInRange(today), [today])

  const isDisabled = (date: string) => date < today || date > maxDate

  const handleConfirm = () => {
    if (!selected) return
    onConfirm(selected)
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
      <button
        onClick={onClose}
        aria-label="Cancel"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
      >
        <X size={20} color={t.textSec} />
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: t.text }}>Date</span>
      <button
        onClick={handleConfirm}
        aria-label="Confirm date"
        disabled={!selected}
        style={{
          background: 'none', border: 'none', cursor: selected ? 'pointer' : 'default',
          padding: 4, display: 'flex', opacity: selected ? 1 : 0.35,
        }}
      >
        <Check size={20} color={t.primary} strokeWidth={2.5} />
      </button>
    </div>
  )

  return (
    <BottomSheet onClose={onClose} zIndex={210} header={header} ariaLabel="Select due date">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
        {QUICK_PICKS.map(pick => {
          const date = clampDueDate(pick.getDate(today), today)
          const Icon = pick.icon
          const active = selected === date
          return (
            <button
              key={pick.id}
              onClick={() => setSelected(date)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'var(--ds-font)', width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: r.md, background: `${pick.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={pick.color} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: 15, color: t.text, fontWeight: active ? 600 : 400 }}>{pick.label}</span>
              </div>
              <span style={{ fontSize: 14, color: t.textSec }}>{weekdayShort(date)}</span>
            </button>
          )
        })}
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8,
        }}>
          {WEEKDAYS.map((day, i) => (
            <span key={`${day}-${i}`} style={{ fontSize: 11, color: t.textTer, textAlign: 'center', fontWeight: 600 }}>
              {day}
            </span>
          ))}
        </div>

        <p style={{ fontSize: 12, color: t.textTer, marginBottom: 12 }}>
          {selected ? weekdayShort(selected) + ', ' + selected : 'No day selected'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxHeight: 280, overflowY: 'auto' }}>
          {months.map(({ year, month }) => (
            <CalendarMonth
              key={`${year}-${month}`}
              year={year}
              month={month}
              today={today}
              maxDate={maxDate}
              selected={selected}
              isDisabled={isDisabled}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}

function CalendarMonth({
  year,
  month,
  today,
  maxDate,
  selected,
  isDisabled,
  onSelect,
}: {
  year: number
  month: number
  today: string
  maxDate: string
  selected: string | null
  isDisabled: (date: string) => boolean
  onSelect: (date: string) => void
}) {
  const totalDays = daysInMonth(year, month)
  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = (firstDay + 6) % 7
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  const toIso = (day: number) => {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 10 }}>
        {monthYearLabel(year, month)}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const date = toIso(day)
          return (
            <CalendarDayCell
              key={date}
              date={date}
              dayNum={day}
              selected={date === selected}
              isToday={date === today}
              disabled={isDisabled(date)}
              todayMark="tint"
              onSelect={onSelect}
            />
          )
        })}
      </div>
    </div>
  )
}
