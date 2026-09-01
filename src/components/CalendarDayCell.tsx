import { t, fonts } from '../ui'

const DAY_CIRCLE = 28
const EVENT_DOT = t.warning

interface Props {
  date: string
  dayNum: number
  selected: boolean
  isToday: boolean
  disabled?: boolean
  inMonth?: boolean
  hasEvents?: boolean
  todayMark?: 'tint' | 'ink'
  onSelect: (date: string) => void
}

export const CalendarDayCell = ({
  date,
  dayNum,
  selected,
  isToday,
  disabled = false,
  inMonth = true,
  hasEvents,
  todayMark = 'ink',
  onSelect,
}: Props) => {
  const isMuted = disabled || !inMonth
  const showTodayTint = isToday && inMonth && !selected && todayMark === 'tint'

  const handleClick = () => {
    if (disabled) return
    onSelect(date)
  }

  return (
    <button
      type="button"
      className="calendar-day-cell"
      onClick={handleClick}
      disabled={disabled}
      aria-label={date}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      style={{
        width: '100%',
        minHeight: 44,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        fontFamily: fonts.ui,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <span
        aria-hidden
        className="calendar-day-mark"
        style={{
          width: DAY_CIRCLE,
          height: DAY_CIRCLE,
          borderRadius: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selected ? t.primary : showTodayTint ? t.errorSub : 'transparent',
          color: selected
            ? t.onPrimary
            : isMuted
              ? t.textTer
              : isToday
                ? todayMark === 'tint' ? t.error : t.primary
                : t.text,
          fontSize: 14,
          fontWeight: selected || isToday ? 600 : 400,
        }}
      >
        {dayNum}
      </span>
      {hasEvents !== undefined && (
        <span
          aria-hidden
          style={{
            width: 4,
            height: 4,
            borderRadius: 9999,
            background: hasEvents ? EVENT_DOT : 'transparent',
          }}
        />
      )}
    </button>
  )
}
