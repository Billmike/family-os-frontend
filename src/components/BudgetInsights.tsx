import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Wallet } from 'lucide-react'
import * as budgetsApi from '../api/budgets'
import { useSession } from '../auth/session'
import type { BudgetPeriod } from '../types'
import { BUDGET_GROUPS } from '../types'
import { BUDGET_GROUP_COLORS, EmptyState, Skeleton, SectionLabel, t, r } from '../ui'

interface Props {
  period: BudgetPeriod | null
}

type InsightMonth = {
  month: string
  incomeExpected: number
  incomeActual: number
  outflowExpected: number
  outflowActual: number
  netExpected: number
  netActual: number
  groups: {
    group: string
    direction: string
    expected: number
    actual: number
    lines: { name: string; actual: number; expected: number }[]
  }[]
}

const euro = (n: number) =>
  `€${n.toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const cardStyle: React.CSSProperties = {
  background: t.surface,
  border: `1px solid ${t.border}`,
  borderRadius: r.lg,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
}

export default function BudgetInsights({ period }: Props) {
  const { family } = useSession()
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState<InsightMonth[]>([])
  const [drillGroup, setDrillGroup] = useState<string | null>(null)

  useEffect(() => {
    if (!family) return
    let cancelled = false
    setLoading(true)
    void budgetsApi
      .getBudgetInsights(family.id, 12)
      .then(data => {
        if (cancelled) return
        setMonths(
          data.months.map(m => ({
            month: m.month,
            incomeExpected: Number(m.income_expected),
            incomeActual: Number(m.income_actual),
            outflowExpected: Number(m.outflow_expected),
            outflowActual: Number(m.outflow_actual),
            netExpected: Number(m.net_expected),
            netActual: Number(m.net_actual),
            groups: m.groups.map(g => ({
              group: g.group,
              direction: g.direction,
              expected: Number(g.expected),
              actual: Number(g.actual),
              lines: g.lines.map(l => ({
                name: l.subcategory_name,
                actual: Number(l.used),
                expected: Number(l.amount),
              })),
            })),
          })),
        )
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [family])

  const stacked = useMemo(() => {
    return months.map(m => {
      const row: Record<string, string | number> = {
        month: m.month.slice(5),
        label: m.month,
      }
      for (const g of BUDGET_GROUPS) {
        if (g === 'Income') continue
        const found = m.groups.find(x => x.group === g)
        row[g] = found?.actual ?? 0
      }
      return row
    })
  }, [months])

  const trend = useMemo(
    () =>
      months.map(m => ({
        month: m.month.slice(5),
        Income: m.incomeActual,
        Expenses: m.outflowActual,
        'Left Over': m.netActual,
      })),
    [months],
  )

  const selected = useMemo(() => {
    if (!period) return months[months.length - 1] ?? null
    return months.find(m => m.month === period.labelMonth) ?? months[months.length - 1] ?? null
  }, [months, period])

  const donut = useMemo(() => {
    if (!selected) return []
    return selected.groups
      .filter(g => g.direction === 'outflow' && g.actual > 0)
      .map(g => ({ name: g.group, value: g.actual }))
  }, [selected])

  const drillLines = useMemo(() => {
    if (!selected || !drillGroup) return []
    const g = selected.groups.find(x => x.group === drillGroup)
    return (g?.lines ?? []).filter(l => l.actual > 0)
  }, [selected, drillGroup])

  const movers = useMemo(() => {
    if (months.length < 2) return []
    const curr = months[months.length - 1]
    const prev = months[months.length - 2]
    const rows: { name: string; delta: number; current: number }[] = []
    for (const g of curr.groups) {
      if (g.direction !== 'outflow') continue
      const prevGroup = prev.groups.find(x => x.group === g.group)
      for (const line of g.lines) {
        const prevLine = prevGroup?.lines.find(l => l.name === line.name)
        const delta = line.actual - (prevLine?.actual ?? 0)
        if (Math.abs(delta) < 0.01) continue
        rows.push({ name: `${g.group} · ${line.name}`, delta, current: line.actual })
      }
    }
    return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6)
  }, [months])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton h={220} />
        <Skeleton h={220} />
      </div>
    )
  }

  if (!months.length) {
    return (
      <EmptyState
        icon={Wallet}
        title="No insight data yet"
        body="Once you have a few cycles of actuals, distribution charts will show up here."
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={cardStyle}>
        <SectionLabel>Outflow by group</SectionLabel>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={stacked} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textSec }} />
              <YAxis tick={{ fontSize: 11, fill: t.textSec }} tickFormatter={v => `€${v}`} width={48} />
              <Tooltip formatter={(v) => euro(Number(v ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {BUDGET_GROUPS.filter(g => g !== 'Income').map(g => (
                <Bar key={g} dataKey={g} stackId="a" fill={BUDGET_GROUP_COLORS[g]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={cardStyle}>
        <SectionLabel>
          {drillGroup ? `${drillGroup} breakdown` : 'This cycle distribution'}
        </SectionLabel>
        {drillGroup ? (
          <button
            type="button"
            onClick={() => setDrillGroup(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: t.primary,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 8,
              padding: 0,
              alignSelf: 'flex-start',
            }}
          >
            ← Back to groups
          </button>
        ) : null}
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={drillGroup ? drillLines.map(l => ({ name: l.name, value: l.actual })) : donut}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                onClick={(_, index) => {
                  if (drillGroup) return
                  const slice = donut[index]
                  if (slice) setDrillGroup(slice.name)
                }}
              >
                {(drillGroup ? drillLines : donut).map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      drillGroup
                        ? BUDGET_GROUP_COLORS[drillGroup] ?? t.primary
                        : BUDGET_GROUP_COLORS[entry.name] ?? t.primary
                    }
                    opacity={drillGroup ? 0.55 + (index % 5) * 0.09 : 1}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => euro(Number(v ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={cardStyle}>
        <SectionLabel>Income vs expenses</SectionLabel>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textSec }} />
              <YAxis tick={{ fontSize: 11, fill: t.textSec }} tickFormatter={v => `€${v}`} width={48} />
              <Tooltip formatter={(v) => euro(Number(v ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Income" stroke={BUDGET_GROUP_COLORS.Income} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke={BUDGET_GROUP_COLORS['Fixed Expense']} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Left Over" stroke={t.success} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {movers.length > 0 && (
        <section style={cardStyle}>
          <SectionLabel>Top movers vs last cycle</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {movers.map(m => (
              <div
                key={m.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontSize: 13,
                  padding: '8px 0',
                  borderBottom: `1px dashed ${t.border}`,
                }}
              >
                <span style={{ color: t.text }}>{m.name}</span>
                <span style={{ color: m.delta >= 0 ? t.error : t.success, fontWeight: 600 }}>
                  {m.delta >= 0 ? '+' : ''}{euro(m.delta)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
