import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarEvent, Member, AppHandlers } from '../types'
import { r, FAB, MemberAvatar } from '../ui'
import { getMember, formatTime } from '../data'

const START_HOUR = 7
const END_HOUR = 22
const HOUR_H = 56
const TIME_W = 52
const MIN_EVENT_H = 44
const VISIBLE_START = START_HOUR * 60
const VISIBLE_END = END_HOUR * 60

interface Props {
  events: CalendarEvent[]
  members: Member[]
  today: string
  openSheet: AppHandlers['openSheet']
}

function addDays(date: string, n: number): string {
  const next = new Date(`${date}T00:00:00`)
  next.setDate(next.getDate() + n)
  const year = next.getFullYear()
  const month = String(next.getMonth() + 1).padStart(2, '0')
  const day = String(next.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekStart(date: string): string {
  const next = new Date(`${date}T00:00:00`)
  const weekday = next.getDay()
  return addDays(date, -(weekday === 0 ? 6 : weekday - 1))
}

function getMonthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

function addMonths(date: string, n: number): string {
  const next = new Date(`${getMonthStart(date)}T00:00:00`)
  next.setMonth(next.getMonth() + n, 1)
  const year = next.getFullYear()
  const month = String(next.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function timeToY(time: string): number {
  return ((minutesFromTime(time) / 60) - START_HOUR) * HOUR_H
}

function minutesToY(minutes: number): number {
  return ((minutes / 60) - START_HOUR) * HOUR_H
}

function eventEndMinutes(event: CalendarEvent): number {
  if (!event.endTime) return minutesFromTime(event.startTime) + 60
  return Math.max(minutesFromTime(event.endTime), minutesFromTime(event.startTime) + 15)
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return '12am'
  if (hour === 12) return '12pm'
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
}

function fmtMonthYear(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function fmtDayName(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3)
}

function fmtDayNum(date: string): number {
  return new Date(`${date}T00:00:00`).getDate()
}

function buildMonthGrid(monthStart: string): string[] {
  const first = new Date(`${monthStart}T00:00:00`)
  const weekday = first.getDay()
  const offset = weekday === 0 ? 6 : weekday - 1
  return Array.from({ length: 42 }, (_, index) => addDays(monthStart, index - offset))
}

function durationLabel(event: CalendarEvent): string | null {
  if (!event.endTime) return null
  const minutes = eventEndMinutes(event) - minutesFromTime(event.startTime)
  if (minutes <= 0) return null
  if (minutes < 60) return `${minutes}m`
  return minutes % 60 === 0 ? `${minutes / 60}h` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function iconButtonStyle(): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    color: 'var(--cal-text)',
    padding: 0,
  }
}

interface LaidOutEvent {
  event: CalendarEvent
  top: number
  height: number
  col: number
  cols: number
  clippedStart: boolean
  clippedEnd: boolean
}

function layoutDayEvents(events: CalendarEvent[]): { visible: LaidOutEvent[]; before: CalendarEvent[]; after: CalendarEvent[] } {
  const before: CalendarEvent[] = []
  const after: CalendarEvent[] = []
  const inRange: { event: CalendarEvent; start: number; end: number }[] = []

  events.forEach(event => {
    const start = minutesFromTime(event.startTime)
    const end = eventEndMinutes(event)
    if (end <= VISIBLE_START) {
      before.push(event)
      return
    }
    if (start >= VISIBLE_END) {
      after.push(event)
      return
    }
    inRange.push({
      event,
      start: Math.max(start, VISIBLE_START),
      end: Math.min(end, VISIBLE_END),
    })
  })

  inRange.sort((a, b) => a.start - b.start || a.end - b.end)

  const clusters: typeof inRange[] = []
  let current: typeof inRange = []
  let clusterEnd = -1
  inRange.forEach(item => {
    if (current.length === 0 || item.start < clusterEnd) {
      current.push(item)
      clusterEnd = Math.max(clusterEnd, item.end)
      return
    }
    clusters.push(current)
    current = [item]
    clusterEnd = item.end
  })
  if (current.length) clusters.push(current)

  const visible: LaidOutEvent[] = []
  clusters.forEach(cluster => {
    const colEnd: number[] = []
    const assigned = cluster.map(item => {
      let col = 0
      while (col < colEnd.length && item.start < colEnd[col]) col += 1
      if (col === colEnd.length) colEnd.push(item.end)
      else colEnd[col] = item.end
      return { ...item, col }
    })
    const cols = colEnd.length
    assigned.forEach(item => {
      const rawStart = minutesFromTime(item.event.startTime)
      const rawEnd = eventEndMinutes(item.event)
      visible.push({
        event: item.event,
        top: minutesToY(item.start) + 1,
        height: Math.max(((item.end - item.start) / 60) * HOUR_H - 2, MIN_EVENT_H),
        col: item.col,
        cols,
        clippedStart: rawStart < VISIBLE_START,
        clippedEnd: rawEnd > VISIBLE_END,
      })
    })
  })

  return { visible, before, after }
}

function DayCircle({ day, isToday, isSelected, size = 32 }: {
  day: string
  isToday: boolean
  isSelected: boolean
  size?: number
}) {
  const background = isToday && isSelected
    ? 'var(--cal-accent)'
    : isSelected
      ? 'var(--cal-text)'
      : isToday
        ? 'var(--cal-accent-subtle)'
        : 'transparent'
  const color = (isToday && isSelected) || isSelected
    ? isToday && isSelected ? 'var(--cal-on-accent)' : 'var(--cal-on-selected)'
    : isToday
      ? 'var(--cal-accent)'
      : 'var(--cal-text)'

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background,
      transition: 'background 0.15s',
    }}>
      <span style={{
        fontSize: size * 0.44,
        fontWeight: isToday || isSelected ? 700 : 400,
        color,
        fontFamily: 'var(--ds-font)',
        lineHeight: 1,
      }}>
        {fmtDayNum(day)}
      </span>
    </div>
  )
}

function EventDots({ events }: { events: CalendarEvent[] }) {
  const colors = [...new Set(events.map(event => getMember(event.memberId).color))].slice(0, 3)
  if (colors.length === 0) return <div style={{ height: 5 }} />
  return (
    <div style={{ display: 'flex', gap: 2, height: 5, alignItems: 'center', justifyContent: 'center' }}>
      {colors.map(color => (
        <div key={color} style={{ width: 4, height: 4, borderRadius: 9999, background: color }} />
      ))}
    </div>
  )
}

function WeekStrip({ weekDays, selectedDate, today, events, onSelect }: {
  weekDays: string[]
  selectedDate: string
  today: string
  events: CalendarEvent[]
  onSelect: (date: string) => void
}) {
  return (
    <div style={{ display: 'flex', background: 'var(--cal-panel)' }}>
      {weekDays.map(day => {
        const dayEvents = events.filter(event => event.date === day)
        const isToday = day === today
        const isSelected = day === selectedDate
        const label = new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })

        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            aria-label={label}
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            style={{
              flex: 1,
              minHeight: 44,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 0 6px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--ds-font)',
            }}
          >
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isSelected ? 'var(--cal-accent)' : 'var(--cal-muted)',
            }}>
              {fmtDayName(day)}
            </span>
            <DayCircle day={day} isToday={isToday} isSelected={isSelected} size={30} />
            <EventDots events={dayEvents} />
          </button>
        )
      })}
    </div>
  )
}

function MemberFilter({ members, selected, onChange }: {
  members: Member[]
  selected: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '10px 16px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      background: 'var(--cal-panel)',
      borderBottom: '1px solid var(--cal-grid)',
      flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={selected === null}
        style={{
          flexShrink: 0,
          minHeight: 44,
          padding: '5px 14px',
          borderRadius: 9999,
          border: `1.5px solid ${selected === null ? 'var(--cal-text)' : 'var(--cal-grid)'}`,
          background: selected === null ? 'var(--cal-text)' : 'var(--cal-panel)',
          color: selected === null ? 'var(--cal-on-selected)' : 'var(--cal-dim)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--ds-font)',
          transition: 'all 0.15s',
        }}
      >
        All
      </button>

      {members.map(member => {
        const active = selected === member.id
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onChange(active ? null : member.id)}
            aria-pressed={active}
            style={{
              flexShrink: 0,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px 5px 5px',
              borderRadius: 9999,
              border: `1.5px solid ${active ? member.color : 'var(--cal-grid)'}`,
              background: active ? member.color : 'var(--cal-panel)',
              color: active ? '#fff' : 'var(--cal-dim)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--ds-font)',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: 20,
              height: 20,
              borderRadius: 9999,
              background: active ? 'rgba(255,255,255,0.25)' : member.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: active ? '#fff' : member.color,
            }}>
              {member.initials}
            </span>
            {member.name}
          </button>
        )
      })}
    </div>
  )
}

function OverflowRow({ events, onEventTap }: {
  events: CalendarEvent[]
  onEventTap: (id: string) => void
}) {
  if (events.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px 8px 62px' }}>
      {events.map(event => {
        const member = getMember(event.memberId)
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onEventTap(event.id)}
            aria-label={`${event.title}, ${formatTime(event.startTime)}`}
            style={{
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: r.md,
              border: 'none',
              borderLeft: `3px solid ${member.color}`,
              background: member.bg,
              cursor: 'pointer',
              fontFamily: 'var(--ds-font)',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cal-event-text)' }}>{event.title}</span>
            <span style={{ fontSize: 11, color: 'var(--cal-dim)' }}>{formatTime(event.startTime)}</span>
          </button>
        )
      })}
    </div>
  )
}

function DayTimeline({ date, today, events, onEventTap }: {
  date: string
  today: string
  events: CalendarEvent[]
  onEventTap: (id: string) => void
}) {
  const dayEvents = events
    .filter(event => event.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const { visible, before, after } = useMemo(() => layoutDayEvents(dayEvents), [dayEvents])
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index)
  const containerH = hours.length * HOUR_H
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    const firstVisible = visible[0]
    const target = firstVisible
      ? Math.max(0, firstVisible.top - HOUR_H)
      : date === today
        ? Math.max(0, timeToY(`${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`) - HOUR_H)
        : 0
    scrollRef.current.scrollTop = target
  }, [date, today, visible])

  const now = new Date()
  const nowY = timeToY(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
  const showNow = date === today && nowY >= 0 && nowY <= containerH

  return (
    <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <OverflowRow events={before} onEventTap={onEventTap} />
      <div style={{ position: 'relative', height: containerH }}>
        {hours.map(hour => (
          <div
            key={hour}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: (hour - START_HOUR) * HOUR_H,
              display: 'flex',
              alignItems: 'flex-start',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <span style={{
              width: TIME_W,
              textAlign: 'right',
              paddingRight: 10,
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--cal-muted)',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              flexShrink: 0,
              marginTop: -5,
            }}>
              {formatHourLabel(hour)}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--cal-grid)' }} />
          </div>
        ))}

        {showNow && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: TIME_W,
              right: 0,
              top: nowY,
              height: 2,
              background: 'var(--cal-accent)',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              position: 'absolute',
              left: -5,
              top: -4,
              width: 10,
              height: 10,
              borderRadius: 9999,
              background: 'var(--cal-accent)',
            }} />
          </div>
        )}

        {visible.map(item => {
          const member = getMember(item.event.memberId)
          const compact = item.height < 56
          const duration = durationLabel(item.event)
          const timeLabel = `${formatTime(item.event.startTime)}${item.event.endTime && !compact ? ` – ${formatTime(item.event.endTime)}` : ''}`
          const gap = 4
          const left = `calc(${TIME_W + 10}px + ((100% - ${TIME_W + 22}px) * ${item.col} / ${item.cols}))`
          const width = `calc((100% - ${TIME_W + 22}px) / ${item.cols} - ${gap}px)`

          return (
            <button
              key={item.event.id}
              type="button"
              onClick={() => onEventTap(item.event.id)}
              aria-label={`${item.event.title}, ${timeLabel}, ${member.name}${item.event.location ? `, ${item.event.location}` : ''}`}
              style={{
                position: 'absolute',
                top: item.top,
                left,
                width,
                height: item.height,
                zIndex: 2,
                borderRadius: r.md,
                background: member.bg,
                border: 'none',
                borderLeft: `3px solid ${member.color}`,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--ds-font)',
                padding: compact ? '0 8px' : '7px 10px',
                display: 'flex',
                alignItems: compact ? 'center' : 'flex-start',
                flexDirection: compact ? 'row' : 'column',
                gap: compact ? 8 : 3,
                overflow: 'hidden',
                boxShadow: `0 1px 4px color-mix(in srgb, ${member.color} 18%, transparent)`,
                opacity: item.clippedStart || item.clippedEnd ? 0.92 : 1,
              }}
            >
              <div style={{
                flex: compact ? 1 : undefined,
                minWidth: 0,
                display: 'flex',
                flexDirection: compact ? 'row' : 'column',
                gap: compact ? 6 : 2,
                alignItems: compact ? 'center' : 'flex-start',
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--cal-event-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: compact ? 140 : '100%',
                }}>
                  {item.event.title}
                </span>
                <span style={{ fontSize: 11, color: 'var(--cal-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {timeLabel}{duration && !compact ? ` · ${duration}` : ''}
                </span>
                {!compact && item.event.location && (
                  <span style={{ fontSize: 11, color: 'var(--cal-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {item.event.location}
                  </span>
                )}
              </div>
              <div style={{ flexShrink: 0, marginLeft: compact ? 'auto' : 0 }}>
                <MemberAvatar member={member} size={compact ? 20 : 24} />
              </div>
            </button>
          )
        })}

        {dayEvents.length === 0 && (
          <div style={{
            position: 'absolute',
            top: 2 * HOUR_H + 12,
            left: TIME_W + 10,
            right: 12,
            minHeight: 44,
            padding: '16px 14px',
            background: 'var(--cal-panel)',
            borderRadius: r.lg,
            border: '1px solid var(--cal-grid)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span aria-hidden style={{ fontSize: 22 }}>✨</span>
            <p style={{ fontSize: 14, color: 'var(--cal-dim)', fontWeight: 500, fontFamily: 'var(--ds-font)', margin: 0 }}>
              Nothing scheduled
            </p>
          </div>
        )}
      </div>
      <OverflowRow events={after} onEventTap={onEventTap} />
    </div>
  )
}

function MonthGrid({ monthStart, selectedDate, today, events, onSelect }: {
  monthStart: string
  selectedDate: string
  today: string
  events: CalendarEvent[]
  onSelect: (date: string) => void
}) {
  const grid = buildMonthGrid(monthStart)
  const currentMonth = monthStart.slice(0, 7)

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid var(--cal-grid)',
        background: 'var(--cal-panel)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => (
          <div key={label} style={{
            textAlign: 'center',
            padding: '8px 0',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--cal-muted)',
            letterSpacing: '0.06em',
          }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {grid.map(day => {
          const inMonth = day.slice(0, 7) === currentMonth
          const isToday = day === today
          const isSelected = day === selectedDate
          const dayEvents = events.filter(event => event.date === day)
          const label = new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={label}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                minHeight: 64,
                padding: '10px 0 8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: '1px solid var(--cal-grid)',
                fontFamily: 'var(--ds-font)',
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <DayCircle day={day} isToday={isToday} isSelected={isSelected} size={30} />
              <EventDots events={dayEvents} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarScreen({ events, members, today, openSheet }: Props) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [anchorDate, setAnchorDate] = useState(() => getWeekStart(today))
  const [selectedDate, setSelectedDate] = useState(today)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [contentKey, setContentKey] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const filteredEvents = memberFilter
    ? events.filter(event => event.memberId === memberFilter)
    : events

  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(anchorDate, index))

  const handleGoPrev = () => {
    if (viewMode === 'week') {
      setAnchorDate(prev => addDays(prev, -7))
      setSelectedDate(prev => addDays(prev, -7))
    } else {
      setAnchorDate(prev => addMonths(prev, -1))
    }
    setContentKey(key => key + 1)
  }

  const handleGoNext = () => {
    if (viewMode === 'week') {
      setAnchorDate(prev => addDays(prev, 7))
      setSelectedDate(prev => addDays(prev, 7))
    } else {
      setAnchorDate(prev => addMonths(prev, 1))
    }
    setContentKey(key => key + 1)
  }

  const handleSwitchView = (mode: 'week' | 'month') => {
    if (mode === viewMode) return
    if (mode === 'month') setAnchorDate(getMonthStart(selectedDate))
    else setAnchorDate(getWeekStart(selectedDate))
    setViewMode(mode)
    setContentKey(key => key + 1)
  }

  const handleDaySelect = (day: string) => {
    setSelectedDate(day)
    if (viewMode === 'month') {
      setAnchorDate(getWeekStart(day))
      setViewMode('week')
      setContentKey(key => key + 1)
    }
  }

  const handleTouchStart = (clientX: number) => {
    touchStartX.current = clientX
  }

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX.current === null || viewMode !== 'week') return
    const delta = clientX - touchStartX.current
    touchStartX.current = null
    if (delta > 48) handleGoPrev()
    if (delta < -48) handleGoNext()
  }

  return (
    <div
      className="calendar-motion"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100%',
        background: 'var(--cal-page)',
      }}
    >
      <div style={{
        maxWidth: 860,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}>
        <div style={{
          background: 'var(--cal-panel)',
          borderBottom: '1px solid var(--cal-grid)',
          flexShrink: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px 6px' }}>
            <button type="button" onClick={handleGoPrev} aria-label={viewMode === 'week' ? 'Previous week' : 'Previous month'} style={iconButtonStyle()}>
              <ChevronLeft size={18} strokeWidth={2} />
            </button>

            <span style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--cal-text)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--ds-font)',
            }}>
              {fmtMonthYear(viewMode === 'week' ? selectedDate : anchorDate)}
            </span>

            <button type="button" onClick={handleGoNext} aria-label={viewMode === 'week' ? 'Next week' : 'Next month'} style={iconButtonStyle()}>
              <ChevronRight size={18} strokeWidth={2} />
            </button>

            <div role="tablist" aria-label="Calendar view" style={{
              display: 'flex',
              marginLeft: 8,
              background: 'var(--cal-toggle)',
              borderRadius: 9999,
              padding: 3,
            }}>
              {(['week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === mode}
                  onClick={() => handleSwitchView(mode)}
                  style={{
                    minHeight: 32,
                    padding: '4px 11px',
                    borderRadius: 9999,
                    border: 'none',
                    background: viewMode === mode ? 'var(--cal-panel)' : 'transparent',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: viewMode === mode ? 'var(--cal-text)' : 'var(--cal-dim)',
                    fontFamily: 'var(--ds-font)',
                    boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.18s',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'week' && (
            <div
              onTouchStart={event => handleTouchStart(event.changedTouches[0].clientX)}
              onTouchEnd={event => handleTouchEnd(event.changedTouches[0].clientX)}
            >
              <WeekStrip
                weekDays={weekDays}
                selectedDate={selectedDate}
                today={today}
                events={filteredEvents}
                onSelect={handleDaySelect}
              />
            </div>
          )}

          <MemberFilter members={members} selected={memberFilter} onChange={setMemberFilter} />
        </div>

        <div
          key={contentKey}
          className="calendar-motion"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            animation: 'calendarEnter 0.22s ease-out',
          }}
        >
          {viewMode === 'week' ? (
            <DayTimeline
              date={selectedDate}
              today={today}
              events={filteredEvents}
              onEventTap={id => openSheet({ type: 'eventDetail', eventId: id })}
            />
          ) : (
            <MonthGrid
              monthStart={anchorDate}
              selectedDate={selectedDate}
              today={today}
              events={filteredEvents}
              onSelect={handleDaySelect}
            />
          )}
        </div>
      </div>

      <FAB onClick={() => openSheet({ type: 'addEvent' })} aria-label="Add event">
        <Plus size={24} color="var(--ds-on-primary)" />
      </FAB>
    </div>
  )
}
