import type {
  CalendarEvent,
  Expense,
  Budget,
  BudgetGroupBlock,
  BudgetPeriod,
  BudgetPeriodSummary,
  BudgetState,
  BudgetSubcategory,
  BudgetSubcategoryGroup,
  BudgetSummary,
  HouseholdSpend,
  Member,
  Notification,
  Receipt,
  ReceiptItem,
  Screen,
  ShoppingItem,
  ShoppingLocation,
  ShoppingSession,
  ShoppingSessionItem,
  ShoppingSpend,
  Task,
} from "../types";
import type {
  BudgetOut,
  BudgetPeriodOut,
  BudgetSubcategoryListOut,
  BudgetSubcategoryOut,
  BudgetSummaryOut,
  EventOut,
  ExpenseOut,
  HouseholdSpendOut,
  MemberOut,
  NotificationOut,
  ReceiptItemOut,
  ReceiptOut,
  ShoppingItemOut,
  ShoppingLocationOut,
  ShoppingSessionItemOut,
  ShoppingSessionOut,
  ShoppingSpendOut,
  TaskOut,
} from "./types";

const MEMBER_PALETTE = [
  { color: "var(--ds-member-1)", bg: "var(--ds-member-1-bg)" },
  { color: "var(--ds-member-2)", bg: "var(--ds-member-2-bg)" },
  { color: "var(--ds-member-3)", bg: "var(--ds-member-3-bg)" },
  { color: "var(--ds-member-4)", bg: "var(--ds-member-4-bg)" },
  { color: "var(--ds-member-5)", bg: "var(--ds-member-5-bg)" },
  { color: "var(--ds-member-6)", bg: "var(--ds-member-6-bg)" },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function toUiMember(m: MemberOut): Member {
  const palette = MEMBER_PALETTE[hashId(m.id) % MEMBER_PALETTE.length];
  const role =
    m.role === "Owner" ? "admin" : m.role === "Parent" ? "parent" : "child";
  return {
    id: m.id,
    name: m.name,
    role,
    initials: initialsFromName(m.name),
    color: palette.color,
    bg: palette.bg,
    userId: m.user_id,
  };
}

function partsInTimezone(
  iso: string,
  timeZone: string,
): { date: string; time: string } {
  const d = new Date(iso);
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return {
    date: dateFmt.format(d),
    time: timeFmt.format(d),
  };
}

export function toCalendarEvent(ev: EventOut, timeZone = "UTC"): CalendarEvent {
  const startIso = ev.occurrence_starts_at ?? ev.starts_at;
  const start = partsInTimezone(startIso, timeZone);
  const end = ev.ends_at ? partsInTimezone(ev.ends_at, timeZone) : null;
  return {
    id: ev.id,
    title: ev.title,
    date: start.date,
    startTime: start.time,
    endTime: end?.time,
    memberId: ev.member_ids[0] ?? "",
    location: ev.location ?? undefined,
    reminder:
      ev.reminder_minutes?.[0] != null
        ? String(ev.reminder_minutes[0])
        : undefined,
    repeat: ev.recurrence_rule ?? undefined,
  };
}

function dueLabel(
  dueAt: string | null,
  today: string,
  timeZone: string,
): string {
  if (!dueAt) return today;
  const { date } = partsInTimezone(dueAt, timeZone);
  const tomorrow = addDays(today, 1);
  if (date === today) return "today";
  if (date === tomorrow) return "tomorrow";
  return date;
}

/**
 * Event list window relative to today.
 * With from = (today - BACK)T00:00:00Z and to = (today + AHEAD)T23:59:59Z,
 * BACK + AHEAD must stay within the API max of 366 days.
 */
export const EVENT_FETCH_BACK_DAYS = 180;
export const EVENT_FETCH_AHEAD_DAYS = 185;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function toTask(task: TaskOut, today: string, timeZone = "UTC"): Task {
  const priority =
    task.priority === "high"
      ? "high"
      : task.priority === "low"
        ? "low"
        : "medium";
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assigneeId: task.assignee_ids[0] ?? "",
    dueDate: dueLabel(task.due_at, today, timeZone),
    dueAt: task.due_at,
    priority,
    recurring: Boolean(task.recurrence_rule),
    category: task.category ?? "Other",
    completed: task.completed_at != null,
  };
}

export function toShoppingItem(item: ShoppingItemOut): ShoppingItem {
  const qty = item.quantity != null ? Number(item.quantity) : 1;
  return {
    id: item.id,
    name: item.name,
    category: item.category ?? "Other",
    quantity: Number.isFinite(qty) ? qty : 1,
    unit: item.unit ?? undefined,
    locationId: item.location_id,
    completed: item.completed_at != null,
    addedById: item.created_by,
  };
}

export function toShoppingLocation(loc: ShoppingLocationOut): ShoppingLocation {
  return {
    id: loc.id,
    name: loc.name,
    sortOrder: loc.sort_order,
  };
}

function parseQuantity(qty: string | null): number {
  const n = qty != null ? Number(qty) : 1;
  return Number.isFinite(n) ? n : 1;
}

export function toShoppingSessionItem(item: ShoppingSessionItemOut): ShoppingSessionItem {
  return {
    id: item.id,
    sessionId: item.session_id,
    name: item.name,
    category: item.category ?? "Other",
    quantity: parseQuantity(item.quantity),
    unit: item.unit ?? undefined,
    locationId: item.location_id,
    locationName: item.location_name,
    addedAt: item.added_at,
    addedById: item.added_by,
  };
}

export function toShoppingSession(session: ShoppingSessionOut): ShoppingSession {
  return {
    id: session.id,
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at ?? undefined,
    totalCost: session.total_cost != null ? Number(session.total_cost) : undefined,
    currency: session.currency,
    itemCount: session.item_count,
    items: session.items?.map(toShoppingSessionItem),
  };
}

export function toShoppingSpend(spend: ShoppingSpendOut): ShoppingSpend {
  return {
    currency: spend.currency,
    currentMonth: spend.current_month,
    yearToDateTotal: Number(spend.year_to_date_total),
    months: spend.months.map(row => ({
      month: row.month,
      total: Number(row.total),
      entryCount: row.trip_count,
      average: Number(row.average),
      categories: [],
    })),
  };
}

export function toBudgetSummary(summary: BudgetSummaryOut): BudgetSummary {
  return {
    periodId: summary.period_id,
    labelMonth: summary.label_month,
    startDate: summary.start_date,
    endDate: summary.end_date,
    amount: Number(summary.amount),
    used: Number(summary.used),
    remaining: Number(summary.remaining),
    percentUsed: summary.percent_used,
    state: summary.state,
  }
}

export function toBudget(budget: BudgetOut): Budget {
  return {
    id: budget.id,
    periodId: budget.period_id,
    familyId: budget.family_id,
    subcategoryId: budget.subcategory_id,
    subcategoryName: budget.subcategory_name,
    group: budget.group,
    amount: Number(budget.amount),
    currency: budget.currency,
    used: Number(budget.used),
    remaining: Number(budget.remaining),
    percentUsed: budget.percent_used,
    state: budget.state,
    settled: budget.settled,
    settlementExpenseId: budget.settlement_expense_id,
    createdAt: budget.created_at,
    updatedAt: budget.updated_at,
  }
}

export function toBudgetPeriod(data: BudgetPeriodOut): BudgetPeriod {
  const summary: BudgetPeriodSummary = {
    incomeExpected: Number(data.summary.income_expected),
    incomeActual: Number(data.summary.income_actual),
    totalExpensesExpected: Number(data.summary.total_expenses_expected),
    totalExpensesActual: Number(data.summary.total_expenses_actual),
    leftOverExpected: Number(data.summary.left_over_expected),
    leftOverActual: Number(data.summary.left_over_actual),
  }
  const groups: BudgetGroupBlock[] = data.groups.map(g => ({
    group: g.group,
    direction: g.direction,
    expected: Number(g.expected),
    actual: Number(g.actual),
    lines: g.lines.map(toBudget),
  }))
  return {
    id: data.id,
    familyId: data.family_id,
    startDate: data.start_date,
    endDate: data.end_date,
    labelMonth: data.label_month,
    currency: data.currency,
    groups,
    summary,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export function toBudgetSubcategory(row: BudgetSubcategoryOut): BudgetSubcategory {
  return {
    id: row.id,
    familyId: row.family_id,
    group: row.group,
    name: row.name,
    sortOrder: row.sort_order,
    role: row.role,
    archivedAt: row.archived_at,
  }
}

export function toBudgetSubcategoryGroups(data: BudgetSubcategoryListOut): BudgetSubcategoryGroup[] {
  return data.groups.map(g => ({
    group: g.group,
    direction: g.direction,
    subcategories: g.subcategories.map(toBudgetSubcategory),
  }))
}

export function formatCycleDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${startLabel} – ${endLabel}`
}

export function formatCycleDay(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export type CycleStatus = 'current' | 'ended' | 'upcoming'

export function cycleStatus(period: { startDate: string; endDate: string }, today: string): CycleStatus {
  if (period.startDate <= today && period.endDate >= today) return 'current'
  if (period.endDate < today) return 'ended'
  return 'upcoming'
}

export function sortBudgetPeriods<T extends { startDate: string; endDate: string }>(periods: T[]): T[] {
  return [...periods].sort((a, b) => {
    const start = a.startDate.localeCompare(b.startDate)
    if (start !== 0) return start
    return a.endDate.localeCompare(b.endDate)
  })
}

export function pickDefaultPeriodId(
  periods: { id: string; startDate: string; endDate: string }[],
  today: string,
): string | null {
  if (periods.length === 0) return null
  const current = periods.find(p => cycleStatus(p, today) === 'current')
  if (current) return current.id
  const past = periods.filter(p => p.endDate < today)
  if (past.length > 0) {
    return past.reduce((best, p) => (p.endDate >= best.endDate ? p : best)).id
  }
  const upcoming = periods.filter(p => p.startDate > today)
  if (upcoming.length > 0) {
    return upcoming.reduce((soonest, p) => (p.startDate <= soonest.startDate ? p : soonest)).id
  }
  return periods[0].id
}

export function nextCycleWindow(period: { startDate: string; endDate: string }): {
  start: string
  end: string
} {
  const start = addDays(period.endDate, 1)
  const spanDays = Math.round(
    (new Date(`${period.endDate}T12:00:00`).getTime()
      - new Date(`${period.startDate}T12:00:00`).getTime())
    / 86_400_000,
  )
  return { start, end: addDays(start, spanDays) }
}

const OVERLAP_RANGE = /overlaps existing cycle \((\d{4}-\d{2}-\d{2}) – (\d{4}-\d{2}-\d{2})\)/

export function parseOverlapRange(message: string): { start: string; end: string } | null {
  const match = OVERLAP_RANGE.exec(message)
  if (!match) return null
  return { start: match[1], end: match[2] }
}

export function monthsOverlapCycle(month: string, startDate: string, endDate: string): boolean {
  const [y, m] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`
  return startDate <= monthEnd && endDate >= monthStart
}

export function periodForMonth<T extends { labelMonth: string; startDate: string; endDate: string }>(
  periods: T[],
  month: string,
): T | null {
  const labeled = periods.find(period => period.labelMonth === month)
  if (labeled) return labeled
  const overlapping = periods.filter(period =>
    monthsOverlapCycle(month, period.startDate, period.endDate),
  )
  if (overlapping.length === 0) return null
  return overlapping[overlapping.length - 1]
}

export function deriveBudgetState(used: number, amount: number): { percentUsed: number; state: BudgetState } {
  if (amount <= 0) {
    return { percentUsed: used > 0 ? 100 : 0, state: used > 0 ? 'over' : 'ok' }
  }
  const percentUsed = Math.round((used / amount) * 100)
  const state: BudgetState = percentUsed >= 100 ? 'over' : percentUsed >= 80 ? 'warning' : 'ok'
  return { percentUsed, state }
}

export function toHouseholdSpend(spend: HouseholdSpendOut): HouseholdSpend {
  return {
    currency: spend.currency,
    currentMonth: spend.current_month,
    yearToDateTotal: Number(spend.year_to_date_total),
    months: spend.months.map(row => ({
      month: row.month,
      total: Number(row.total),
      entryCount: row.entry_count,
      average: Number(row.average),
      categories: row.categories.map(cat => ({
        category: cat.category,
        subcategoryId: cat.subcategory_id ?? null,
        group: cat.group ?? null,
        total: Number(cat.total),
        count: cat.count,
      })),
    })),
    budget: spend.budget ? toBudgetSummary(spend.budget) : spend.budget ?? null,
  };
}

export function toExpense(expense: ExpenseOut): Expense {
  return {
    id: expense.id,
    amount: Number(expense.amount),
    currency: expense.currency,
    subcategoryId: expense.subcategory_id,
    subcategoryName: expense.subcategory_name,
    group: expense.group,
    direction: expense.direction,
    merchant: expense.merchant,
    note: expense.note,
    occurredAt: expense.occurred_at,
    sourceType: expense.source_type,
    sourceId: expense.source_id,
    sourceItemCount: expense.source_item_count,
  };
}

function parseOptionalNumber(value: string | null | undefined): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function toReceiptItem(item: ReceiptItemOut): ReceiptItem {
  return {
    id: item.id,
    receiptId: item.receipt_id,
    position: item.position,
    name: item.name,
    quantity: parseOptionalNumber(item.quantity),
    unit: item.unit,
    unitPrice: parseOptionalNumber(item.unit_price),
    totalPrice: Number(item.total_price),
    taxCode: item.tax_code,
    isIncluded: item.is_included,
  }
}

export function toReceipt(receipt: ReceiptOut): Receipt {
  return {
    id: receipt.id,
    familyId: receipt.family_id,
    uploadedBy: receipt.uploaded_by,
    status: receipt.status,
    mimeType: receipt.mime_type,
    byteSize: receipt.byte_size,
    originalFilename: receipt.original_filename,
    categoryHint: receipt.category_hint,
    suggestedCategory: receipt.suggested_category,
    suggestedSubcategoryId: receipt.suggested_subcategory_id ?? null,
    merchant: receipt.merchant,
    purchasedAt: receipt.purchased_at,
    currency: receipt.currency,
    subtotal: parseOptionalNumber(receipt.subtotal),
    taxTotal: parseOptionalNumber(receipt.tax_total),
    total: parseOptionalNumber(receipt.total),
    totalsMismatch: receipt.totals_mismatch,
    modelName: receipt.model_name,
    errorMessage: receipt.error_message,
    expenseId: receipt.expense_id,
    shoppingSessionId: receipt.shopping_session_id,
    items: (receipt.items ?? []).map(toReceiptItem),
    createdAt: receipt.created_at,
    updatedAt: receipt.updated_at,
  }
}

export function dateInputFromIso(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateInputToIso(date: string): string {
  return new Date(`${date}T12:00:00`).toISOString();
}

export function formatMoney(amount: number, currency = "EUR"): string {
  const symbol = currency === "EUR" ? "€" : `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatYearMonthTitle(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function formatMonthShort(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatSessionCost(session: ShoppingSession): string {
  if (session.totalCost == null) return "";
  const symbol = session.currency === "EUR" ? "€" : session.currency;
  return `${symbol}${session.totalCost.toFixed(2)}`;
}

export function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function expenseTitle(expense: Expense): string {
  if (expense.merchant) return expense.merchant
  if (expense.sourceType === "shopping_session") return "Shopping trip"
  if (expense.sourceType === "budget_line") return `Settled: ${expense.subcategoryName}`
  return `${expense.group} · ${expense.subcategoryName}`
}

function entityToScreen(entityType: string | null): Screen | undefined {
  if (!entityType) return undefined;
  if (entityType === "event" || entityType === "calendar") return "calendar";
  if (entityType === "task") return "tasks";
  if (entityType === "shopping" || entityType === "shopping_item" || entityType === "shopping_session")
    return "shopping";
  if (entityType === "family" || entityType === "invitation") return "family";
  if (entityType === "budget") return "budget";
  if (entityType === "expense") return "budgetSpend";
  return undefined;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function toNotification(n: NotificationOut): Notification {
  const type =
    n.type === "calendar" ||
    n.type === "task" ||
    n.type === "shopping" ||
    n.type === "family" ||
    n.type === "budget"
      ? n.type
      : "family";
  return {
    id: n.id,
    type,
    title: n.title,
    body: n.body,
    timestamp: formatRelativeTime(n.created_at),
    read: n.read_at != null,
    targetScreen: entityToScreen(n.entity_type) ?? entityToScreen(n.type),
  };
}

/** Build ISO datetime from local date + HH:MM in a given IANA timezone (approx via offset at that date). */
export function localDateTimeToIso(
  date: string,
  time: string,
  timeZone: string,
): string {
  const [hour, minute] = time.split(":").map(Number);
  // Construct a UTC guess then adjust using timezone offset at that instant
  const guess = new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  );
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // Use iterative approach: format parts in target TZ and compute delta
  const asUtc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hour,
    minute,
    0,
  );
  const probe = new Date(asUtc);
  const parts = Object.fromEntries(
    formatter.formatToParts(probe).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const tzHour = Number(parts.hour === "24" ? "0" : parts.hour);
  const tzMin = Number(parts.minute);
  const desired = hour * 60 + minute;
  const actual = tzHour * 60 + tzMin;
  const deltaMin = desired - actual;
  return new Date(asUtc + deltaMin * 60_000).toISOString();
}

export function dueDateToIso(
  dueDate: "today" | "tomorrow" | string,
  today: string,
  timeZone: string,
): string {
  let date = today;
  if (dueDate === "tomorrow") date = addDays(today, 1);
  else if (dueDate !== "today") date = dueDate;
  return localDateTimeToIso(date, "17:00", timeZone);
}

export function priorityToApi(p: "high" | "medium" | "low"): string {
  if (p === "medium") return "normal";
  return p;
}

export function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatLongDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export const TASK_DUE_MAX_DAYS = 365;

export function dueAtToDate(
  dueAt: string | null,
  timeZone: string,
): string | null {
  if (!dueAt) return null;
  return partsInTimezone(dueAt, timeZone).date;
}

export function thisWeekendDate(today: string): string {
  const d = new Date(today + "T12:00:00");
  const day = d.getDay();
  if (day === 6) return today;
  return addDays(today, 6 - day);
}

export function nextWeekMonday(today: string): string {
  const d = new Date(today + "T12:00:00");
  const day = d.getDay();
  if (day === 1) return today;
  if (day === 0) return addDays(today, 1);
  return addDays(today, 8 - day);
}

export function clampDueDate(date: string, today: string): string {
  const max = addDays(today, TASK_DUE_MAX_DAYS);
  if (date < today) return today;
  if (date > max) return max;
  return date;
}

export function formatTaskDueLabel(
  dueAt: string | null,
  today: string,
  timeZone: string,
): string {
  if (!dueAt) return "Date";
  const label = dueLabel(dueAt, today, timeZone);
  if (label === "today") return "Today";
  if (label === "tomorrow") return "Tomorrow";
  const d = new Date(label + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function weekdayShort(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
  });
}

export function monthYearLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function calendarMonthsInRange(
  today: string,
  maxDays: number = TASK_DUE_MAX_DAYS,
): { year: number; month: number }[] {
  const start = new Date(today + "T12:00:00");
  const end = new Date(addDays(today, maxDays) + "T12:00:00");
  const months: { year: number; month: number }[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return months;
}
