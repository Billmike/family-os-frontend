import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import * as budgetsApi from "../api/budgets";
import { useSession } from "../auth/session";
import type { BudgetPeriod } from "../types";
import {
  formatMoney,
  formatMonthShort,
  formatYearMonthCompact,
} from "../api/adapters";
import { SpendBarChart, type SpendBucket } from "./SpendBarChart";
import {
  BUDGET_GROUP_COLORS,
  EmptyState,
  Skeleton,
  SectionLabel,
  t,
  fonts,
} from "../ui";

interface Props {
  period: BudgetPeriod | null;
  periods: BudgetPeriod[];
  today: string;
  onSelectPeriod: (periodId: string) => void;
}

type InsightLine = {
  name: string;
  actual: number;
  expected: number;
};

type InsightGroup = {
  group: string;
  direction: string;
  expected: number;
  actual: number;
  lines: InsightLine[];
};

type InsightMonth = {
  month: string;
  incomeExpected: number;
  incomeActual: number;
  outflowExpected: number;
  outflowActual: number;
  netExpected: number;
  netActual: number;
  groups: InsightGroup[];
};

type SpendRow = {
  key: string;
  name: string;
  group: string;
  actual: number;
  expected: number;
};

const MS_DAY = 86_400_000;

const daysInclusive = (from: string, to: string) => {
  const start = Date.parse(`${from}T00:00:00`);
  const end = Date.parse(`${to}T00:00:00`);
  return Math.round((end - start) / MS_DAY) + 1;
};

const cycleDayStats = (startDate: string, endDate: string, today: string) => {
  const total = Math.max(1, daysInclusive(startDate, endDate));
  if (today < startDate) return { remaining: total, total };
  if (today > endDate) return { remaining: 0, total };
  return { remaining: daysInclusive(today, endDate), total };
};

const allocatePercents = (amounts: number[]): number[] => {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0 || amounts.length === 0) return amounts.map(() => 0);

  const hundredthsTarget = 10000;
  const exact = amounts.map((amount) => (amount / total) * hundredthsTarget);
  const floors = exact.map((value) => Math.floor(value + 1e-9));
  let leftover = hundredthsTarget - floors.reduce((sum, value) => sum + value, 0);

  const order = amounts
    .map((_, index) => index)
    .sort((a, b) => {
      const remainderA = exact[a] - floors[a];
      const remainderB = exact[b] - floors[b];
      if (remainderB !== remainderA) return remainderB - remainderA;
      return amounts[b] - amounts[a];
    });

  const hundredths = [...floors];
  for (const index of order) {
    if (leftover <= 0) break;
    hundredths[index] += 1;
    leftover -= 1;
  }

  return hundredths.map((value) => value / 100);
};


const outflowLinesFromMonth = (month: InsightMonth): SpendRow[] => {
  const rows: SpendRow[] = [];
  for (const group of month.groups) {
    if (group.direction !== "outflow") continue;
    for (const line of group.lines) {
      if (line.actual <= 0) continue;
      rows.push({
        key: `${group.group}:${line.name}`,
        name: line.name,
        group: group.group,
        actual: line.actual,
        expected: line.expected,
      });
    }
  }
  return rows;
};

const outflowGroupsFromMonth = (month: InsightMonth): SpendRow[] =>
  month.groups
    .filter((group) => group.direction === "outflow" && group.actual > 0)
    .map((group) => ({
      key: group.group,
      name: group.group,
      group: group.group,
      actual: group.actual,
      expected: group.expected,
    }));

const outflowLinesFromPeriod = (period: BudgetPeriod): SpendRow[] => {
  const rows: SpendRow[] = [];
  for (const group of period.groups) {
    if (group.direction !== "outflow") continue;
    for (const line of group.lines) {
      if (line.used <= 0) continue;
      rows.push({
        key: `${group.group}:${line.subcategoryName}`,
        name: line.subcategoryName,
        group: group.group,
        actual: line.used,
        expected: line.amount,
      });
    }
  }
  return rows;
};

const outflowGroupsFromPeriod = (period: BudgetPeriod): SpendRow[] =>
  period.groups
    .filter((group) => group.direction === "outflow" && group.actual > 0)
    .map((group) => ({
      key: group.group,
      name: group.group,
      group: group.group,
      actual: group.actual,
      expected: group.expected,
    }));

const collectOutflowLines = (month: InsightMonth) => {
  const map = new Map<string, SpendRow>();
  for (const group of month.groups) {
    if (group.direction !== "outflow") continue;
    for (const line of group.lines) {
      map.set(`${group.group}:${line.name}`, {
        key: `${group.group}:${line.name}`,
        name: line.name,
        group: group.group,
        actual: line.actual,
        expected: line.expected,
      });
    }
  }
  return map;
};

const collectOutflowGroups = (month: InsightMonth) => {
  const map = new Map<string, SpendRow>();
  for (const group of month.groups) {
    if (group.direction !== "outflow") continue;
    map.set(group.group, {
      key: group.group,
      name: group.group,
      group: group.group,
      actual: group.actual,
      expected: group.expected,
    });
  }
  return map;
};

const signedMoney = (value: number, currency: string) => {
  const formatted = formatMoney(Math.abs(value), currency);
  if (value > 0.005) return `+${formatted}`;
  if (value < -0.005) return `-${formatted}`;
  return formatted;
};

export default function BudgetInsights({
  period,
  periods,
  today,
  onSelectPeriod,
}: Props) {
  const { family } = useSession();
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<InsightMonth[]>([]);
  const currency = period?.currency ?? "EUR";

  useEffect(() => {
    if (!family) return;
    let cancelled = false;
    setLoading(true);
    void budgetsApi
      .getBudgetInsights(family.id, 12)
      .then((data) => {
        if (cancelled) return;
        setMonths(
          data.months.map((m) => ({
            month: m.month,
            incomeExpected: Number(m.income_expected),
            incomeActual: Number(m.income_actual),
            outflowExpected: Number(m.outflow_expected),
            outflowActual: Number(m.outflow_actual),
            netExpected: Number(m.net_expected),
            netActual: Number(m.net_actual),
            groups: m.groups.map((g) => ({
              group: g.group,
              direction: g.direction,
              expected: Number(g.expected),
              actual: Number(g.actual),
              lines: g.lines.map((l) => ({
                name: l.subcategory_name,
                actual: Number(l.used),
                expected: Number(l.amount),
              })),
            })),
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [family]);

  const selected = useMemo(() => {
    if (!period) return months[months.length - 1] ?? null;
    return months.find((m) => m.month === period.labelMonth) ?? null;
  }, [months, period]);

  const snapshot = useMemo(() => {
    if (!period) return null;
    const spent = period.summary.totalExpensesActual;
    const budgeted = period.summary.totalExpensesExpected;
    const net = budgeted - spent;
    const days = cycleDayStats(period.startDate, period.endDate, today);
    return { spent, budgeted, net, days };
  }, [period, today]);

  const ranked = useMemo(() => {
    let rows: SpendRow[] = [];
    if (selected) {
      rows = outflowLinesFromMonth(selected);
      if (rows.length === 0 && selected.outflowActual > 0) {
        rows = outflowGroupsFromMonth(selected);
      }
    }
    if (rows.length === 0 && period) {
      rows = outflowLinesFromPeriod(period);
      if (rows.length === 0 && period.summary.totalExpensesActual > 0) {
        rows = outflowGroupsFromPeriod(period);
      }
    }
    const rankedRows = [...rows].sort((a, b) => b.actual - a.actual);
    const percents = allocatePercents(rankedRows.map((row) => row.actual));
    return rankedRows.map((row, index) => ({
      ...row,
      rank: index + 1,
      percent: percents[index] ?? 0,
      variance: row.actual - row.expected,
    }));
  }, [selected, period]);

  const chartMonths = useMemo(() => {
    const withSpendOrPeriod = months.filter(
      (m) =>
        m.outflowActual > 0 || periods.some((p) => p.labelMonth === m.month),
    );
    const source = withSpendOrPeriod.length > 0 ? withSpendOrPeriod : months;
    return source.slice(-6);
  }, [months, periods]);

  const chartBuckets: SpendBucket[] = useMemo(
    () =>
      chartMonths.map((m) => {
        const match = periods.find((p) => p.labelMonth === m.month);
        return {
          id: match?.id ?? m.month,
          total: m.outflowActual,
          label: formatMonthShort(m.month),
          shortLabel: formatMonthShort(m.month),
          selectable: Boolean(match),
        };
      }),
    [chartMonths, periods],
  );

  const avgSpend =
    chartMonths.length > 0
      ? chartMonths.reduce((sum, m) => sum + m.outflowActual, 0) /
        chartMonths.length
      : 0;

  const vsPrevious = useMemo(() => {
    if (!selected) return null;
    const selectedIndex = months.findIndex((m) => m.month === selected.month);
    if (selectedIndex < 1) return null;
    const previous = months[selectedIndex - 1];

    const buildDeltas = (
      currentMap: Map<string, SpendRow>,
      previousMap: Map<string, SpendRow>,
    ) => {
      const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
      const rows: {
        key: string;
        name: string;
        group: string;
        previous: number;
        current: number;
        delta: number;
      }[] = [];
      for (const key of keys) {
        const currentRow = currentMap.get(key);
        const previousRow = previousMap.get(key);
        const current = currentRow?.actual ?? 0;
        const previousAmount = previousRow?.actual ?? 0;
        const delta = current - previousAmount;
        if (Math.abs(delta) < 0.01) continue;
        rows.push({
          key,
          name: currentRow?.name ?? previousRow?.name ?? key,
          group: currentRow?.group ?? previousRow?.group ?? "",
          previous: previousAmount,
          current,
          delta,
        });
      }
      return rows
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 6);
    };

    let rows = buildDeltas(
      collectOutflowLines(selected),
      collectOutflowLines(previous),
    );
    if (rows.length === 0) {
      rows = buildDeltas(
        collectOutflowGroups(selected),
        collectOutflowGroups(previous),
      );
    }
    if (rows.length === 0) return null;
    return { previousMonth: previous.month, rows };
  }, [months, selected]);

  const handleSelectBar = (id: string) => {
    const byId = periods.find((p) => p.id === id);
    if (byId) {
      onSelectPeriod(byId.id);
      return;
    }
    const byMonth = periods.find((p) => p.labelMonth === id);
    if (byMonth) onSelectPeriod(byMonth.id);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Skeleton h={220} />
        <Skeleton h={220} />
      </div>
    );
  }

  if (!months.length) {
    return (
      <EmptyState
        icon={Wallet}
        title="No insight data yet"
        body="Once you have a few cycles of actuals, distribution charts will show up here."
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        paddingBottom: 24,
      }}
    >
      {snapshot && (
        <section
          aria-label="Cycle snapshot"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <SnapshotStat
            label="Spent this cycle"
            value={formatMoney(snapshot.spent, currency)}
            detail={`of ${formatMoney(snapshot.budgeted, currency)}`}
            valueColor={
              snapshot.spent > snapshot.budgeted + 0.005 ? t.attention : t.text
            }
          />
          <SnapshotStat
            label="Net position"
            value={formatMoney(Math.abs(snapshot.net), currency)}
            detail={snapshot.net >= 0 ? "remaining" : "over budget"}
            valueColor={snapshot.net >= 0 ? t.success : t.attention}
            divided
          />
        </section>
      )}

      <section>
        <SectionLabel>Where the money went</SectionLabel>
        {ranked.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "8px 16px 16px",
              fontSize: 13,
              color: t.textSec,
              fontFamily: fonts.ui,
            }}
          >
            No spend lines this cycle.
          </p>
        ) : (
          <ol
            aria-label="Ranked subcategory spend"
            style={{ listStyle: "none", margin: 0, padding: "0 0 8px" }}
          >
            {ranked.map((row) => {
              const over = row.variance > 0.005;
              const under = row.variance < -0.005;
              const barColor = BUDGET_GROUP_COLORS[row.group] ?? t.primary;
              return (
                <li
                  key={row.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: `1px dashed ${t.border}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: t.textTer,
                      fontFamily: fonts.ui,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.rank}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: t.text,
                          fontFamily: fonts.ui,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: t.textTer,
                          fontFamily: fonts.ui,
                          flexShrink: 0,
                        }}
                      >
                        {row.percent.toFixed(2)}%
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      style={{
                        height: 6,
                        borderRadius: 4,
                        background: t.surfaceMuted,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${row.percent}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                      minWidth: 84,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: t.text,
                        fontFamily: fonts.ui,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatMoney(row.actual, currency)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: over
                          ? t.attention
                          : under
                            ? t.success
                            : t.textTer,
                        fontFamily: fonts.ui,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {over || under
                        ? signedMoney(row.variance, currency)
                        : "on plan"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {chartBuckets.length > 0 && (
        <section>
          <SectionLabel>Monthly spend — last 6 cycles</SectionLabel>
          <SpendBarChart
            buckets={chartBuckets}
            selectedId={period?.id ?? ""}
            currency={currency}
            onSelect={handleSelectBar}
            ariaLabel="Spend for the last six cycles"
          />
          <p
            style={{
              margin: 0,
              padding: "8px 4px 16px",
              fontSize: 12,
              color: t.textSec,
              fontFamily: fonts.ui,
            }}
          >
            Avg {formatMoney(avgSpend, currency)} across these cycles
          </p>
        </section>
      )}

      {vsPrevious && (
        <section>
          <SectionLabel>
            Vs previous cycle ·{" "}
            {formatYearMonthCompact(vsPrevious.previousMonth)}
          </SectionLabel>
          <ul
            aria-label="Biggest changes versus previous cycle"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {vsPrevious.rows.map((row) => {
              const over = row.delta > 0;
              return (
                <li
                  key={row.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "10px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: `1px dashed ${t.border}`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: BUDGET_GROUP_COLORS[row.group] ?? t.primary,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: t.text,
                        fontFamily: fonts.ui,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: t.textTer,
                        fontFamily: fonts.ui,
                        marginTop: 2,
                      }}
                    >
                      {formatMoney(row.previous, currency)} →{" "}
                      {formatMoney(row.current, currency)}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: over ? t.attention : t.success,
                      fontFamily: fonts.ui,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {signedMoney(row.delta, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

const SnapshotStat = ({
  label,
  value,
  detail,
  valueColor = t.text,
  divided = false,
}: {
  label: string;
  value: string;
  detail: string;
  valueColor?: string;
  divided?: boolean;
}) => (
  <div
    style={{
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: "16px 16px 18px",
      borderLeft: divided ? `1px solid ${t.border}` : undefined,
    }}
  >
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: t.textTer,
        fontFamily: fonts.ui,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 28,
        fontWeight: 500,
        letterSpacing: "-0.03em",
        color: valueColor,
        fontFamily: fonts.display,
        lineHeight: 1.1,
      }}
    >
      {value}
    </span>
    <span
      style={{
        fontSize: 12,
        color: t.textSec,
        fontFamily: fonts.ui,
      }}
    >
      {detail}
    </span>
  </div>
);
