import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarEvent, Member, AppHandlers } from '../types'
import { t, r, FAB, SegmentedControl, SectionLabel } from '../ui'
import { getMember, formatTime } from '../data'

const EVENT_DOT = t.warning
const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface Props {
  events: CalendarEvent[]
  members: Member[]
  today: string
  openSheet: AppHandlers['openSheet']
}

function monthFromDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatMonthTitle(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function firstOfMonth(yearMonth: string): string {
  return `${yearMonth}-01`
}

function getMonthGrid(yearMonth: string): { date: string; dayNum: number; inMonth: boolean }[] {
  const [y, m] = yearMonth.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday = 0
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - startOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    const year = day.getFullYear()
    const month = String(day.getMonth() + 1).padStart(2, '0')
    const dateNum = String(day.getDate()).padStart(2, '0')
    const date = `${year}-${month}-${dateNum}`
    return {
      date,
      dayNum: day.getDate(),
      inMonth: monthFromDate(date) === yearMonth,
    }
  })
}

function groupEventsByDate(events: CalendarEvent[]) {
  const map: Record<string, CalendarEvent[]> = {}
  events.forEach(ev => {
    ;(map[ev.date] ??= []).push(ev)
  })
  return map
}

function formatDayLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'TODAY'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
}

function defaultSelectedForMonth(yearMonth: string, today: string): string {
  return monthFromDate(today) === yearMonth ? today : firstOfMonth(yearMonth)
}

export default function CalendarScreen({ events, openSheet, today }: Props) {
  const [view, setView] = useState<'Agenda' | 'Month'>('Agenda')
  const [visibleMonth, setVisibleMonth] = useState(() => monthFromDate(today))
  const [selectedDate, setSelected] = useState(today)

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  const grouped = groupEventsByDate(sorted)
  const monthCells = getMonthGrid(visibleMonth)
  const dayEvents = grouped[selectedDate] ?? []

  const agendaDates = Object.keys(grouped)
    .filter(d => d >= today)
    .sort()

  function goToMonth(nextMonth: string) {
    setVisibleMonth(nextMonth)
    setSelected(defaultSelectedForMonth(nextMonth, today))
  }

  function selectDay(date: string) {
    setSelected(date)
    const dayMonth = monthFromDate(date)
    if (dayMonth !== visibleMonth) setVisibleMonth(dayMonth)
  }

  function goToToday() {
    setVisibleMonth(monthFromDate(today))
    setSelected(today)
  }

  const showingToday = selectedDate === today && visibleMonth === monthFromDate(today)

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SegmentedControl options={['Agenda', 'Month']} value={view} onChange={v => setView(v as 'Agenda' | 'Month')} />
      </div>

      {view === 'Agenda' && (
        <div>
          {agendaDates.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: t.textSec }}>Your calendar is clear.</p>
              <p style={{ fontSize: 14, color: t.textTer, marginTop: 6 }}>Tap + to add an event.</p>
            </div>
          ) : agendaDates.map(date => (
            <div key={date}>
              <SectionLabel>{formatDayLabel(date, today)}</SectionLabel>
              <div>
                {(grouped[date] ?? []).map((ev, i) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    divider={i > 0}
                    onClick={() => openSheet({ type: 'eventDetail', eventId: ev.id })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'Month' && (
        <div>
          <div style={{ margin: '4px 16px 12px', padding: '12px 8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => goToMonth(shiftMonth(visibleMonth, -1))}
                style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', background: 'transparent', borderRadius: r.md, cursor: 'pointer', color: t.text,
                }}
              >
                <ChevronLeft size={20} strokeWidth={1.75} />
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 40, gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{formatMonthTitle(visibleMonth)}</span>
                {!showingToday && (
                  <button
                    type="button"
                    onClick={goToToday}
                    style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: t.primary, padding: '2px 8px',
                      fontFamily: 'var(--ds-font)',
                    }}
                  >
                    Today
                  </button>
                )}
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => goToMonth(shiftMonth(visibleMonth, 1))}
                style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', background: 'transparent', borderRadius: r.md, cursor: 'pointer', color: t.text,
                }}
              >
                <ChevronRight size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {WEEKDAY_HEADERS.map((label, i) => (
                <div key={`${label}-${i}`} style={{ textAlign: 'center', fontSize: 11, fontWeight: 500, color: t.textTer, padding: '4px 0' }}>
                  {label}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {monthCells.map(cell => {
                const active = cell.date === selectedDate
                const hasEvents = (grouped[cell.date]?.length ?? 0) > 0
                const isToday = cell.date === today
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => selectDay(cell.date)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      minHeight: 44, padding: '6px 0', border: 'none', borderRadius: r.md, cursor: 'pointer',
                      background: active ? t.primary : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{
                      fontSize: 14,
                      fontWeight: active || isToday ? 600 : 400,
                      color: active
                        ? t.onPrimary
                        : !cell.inMonth
                          ? t.textTer
                          : isToday
                            ? t.primary
                            : t.text,
                    }}>
                      {cell.dayNum}
                    </span>
                    <div style={{
                      width: 4, height: 4, borderRadius: 9999, marginTop: 3,
                      background: hasEvents
                        ? (active ? 'color-mix(in srgb, var(--ds-on-primary) 85%, transparent)' : EVENT_DOT)
                        : 'transparent',
                    }} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            {dayEvents.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 15, color: t.textSec }}>No events on this day.</p>
              </div>
            ) : (
              <div>
                {dayEvents.map((ev, i) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    divider={i > 0}
                    onClick={() => openSheet({ type: 'eventDetail', eventId: ev.id })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <FAB onClick={() => openSheet({ type: 'addEvent' })}>
        <Plus size={24} color={t.onPrimary} />
      </FAB>
    </div>
  )
}

function EventRow({ event, divider, onClick }: { event: CalendarEvent; divider: boolean; onClick: () => void }) {
  const member = getMember(event.memberId)
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 16px', border: 'none', background: 'none',
      borderTop: divider ? `1px solid ${t.border}` : 'none',
      cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--ds-font)',
    }}>
      <div style={{ minWidth: 52, flexShrink: 0, textAlign: 'right' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: t.textSec }}>{formatTime(event.startTime)}</span>
      </div>
      <div style={{ width: 3, height: 32, borderRadius: 9999, background: member.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: t.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {event.endTime && (
            <span style={{ fontSize: 12, color: t.textTer }}>Until {formatTime(event.endTime)}</span>
          )}
          {event.location && (
            <span style={{ fontSize: 12, color: t.textTer }}>{event.endTime ? '·' : ''} {event.location}</span>
          )}
        </div>
      </div>
    </button>
  )
}
