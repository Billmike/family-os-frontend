import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { CalendarEvent, Member, AppHandlers } from '../types'
import { t, r, MemberAvatar, FAB, SegmentedControl, SectionLabel } from '../ui'
import { getMember, formatTime } from '../data'

interface Props {
  events: CalendarEvent[]
  members: Member[]
  today: string
  openSheet: AppHandlers['openSheet']
}

function getWeekDays(anchor: string): { date: string; label: string; day: string }[] {
  const d = new Date(anchor + 'T00:00:00')
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const iso = day.toISOString().split('T')[0]
    return {
      date: iso,
      label: day.toLocaleDateString('en-GB', { day: 'numeric' }),
      day: day.toLocaleDateString('en-GB', { weekday: 'short' }),
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

export default function CalendarScreen({ events, openSheet, today }: Props) {
  const [view, setView] = useState<'Agenda' | 'Week'>('Agenda')
  const [selectedDate, setSelected] = useState(today)

  const monthLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  const grouped = groupEventsByDate(sorted)
  const weekDays = getWeekDays(today)
  const weekEvents = grouped[selectedDate] ?? []

  const agendaDates = Object.keys(grouped)
    .filter(d => d >= today)
    .sort()

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SegmentedControl options={['Agenda', 'Week']} value={view} onChange={v => setView(v as 'Agenda' | 'Week')} />
        <span style={{ fontSize: 13, color: t.textSec }}>{monthLabel}</span>
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
              <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden', marginBottom: 8 }}>
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

      {view === 'Week' && (
        <div>
          <div style={{ margin: '4px 16px 12px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, padding: '12px 4px', display: 'flex', gap: 2 }}>
            {weekDays.map(wd => {
              const active = wd.date === selectedDate
              const hasEvents = (grouped[wd.date]?.length ?? 0) > 0
              return (
                <button key={wd.date} onClick={() => setSelected(wd.date)} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '6px 0', border: 'none', borderRadius: r.md, cursor: 'pointer',
                  background: active ? t.primary : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'rgba(255,255,255,0.7)' : t.textTer, marginBottom: 4 }}>{wd.day}</span>
                  <span style={{ fontSize: 15, fontWeight: active ? 600 : 400, color: active ? '#fff' : wd.date === today ? t.primary : t.text }}>{wd.label}</span>
                  {hasEvents && !active && (
                    <div style={{ width: 4, height: 4, borderRadius: 9999, background: t.primary, marginTop: 3 }} />
                  )}
                </button>
              )
            })}
          </div>

          <div>
            {weekEvents.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 15, color: t.textSec }}>No events on this day.</p>
              </div>
            ) : (
              <div style={{ margin: '0 16px', background: t.surface, borderRadius: r.lg, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                {weekEvents.map((ev, i) => (
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
        <Plus size={24} color="#fff" />
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
      <div style={{ width: 3, height: 40, borderRadius: 9999, background: member.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: t.text, marginBottom: 3 }}>{event.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {event.endTime && (
            <span style={{ fontSize: 12, color: t.textTer }}>Until {formatTime(event.endTime)}</span>
          )}
          {event.location && (
            <span style={{ fontSize: 12, color: t.textTer }}>{event.endTime ? '·' : ''} {event.location}</span>
          )}
        </div>
      </div>
      <MemberAvatar member={member} size={26} />
    </button>
  )
}
