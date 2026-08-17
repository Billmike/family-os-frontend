import type {
  CalendarEvent,
  Member,
  Notification,
  Screen,
  ShoppingItem,
  ShoppingLocation,
  ShoppingSession,
  ShoppingSessionItem,
  Task,
} from "../types";
import type {
  EventOut,
  MemberOut,
  NotificationOut,
  ShoppingItemOut,
  ShoppingLocationOut,
  ShoppingSessionItemOut,
  ShoppingSessionOut,
  TaskOut,
} from "./types";

const MEMBER_PALETTE = [
  { color: "#6366F1", bg: "#EEF2FF" },
  { color: "#0284C7", bg: "#E0F2FE" },
  { color: "#059669", bg: "#ECFDF5" },
  { color: "#D97706", bg: "#FEF3C7" },
  { color: "#E11D48", bg: "#FFF1F2" },
  { color: "#7C3AED", bg: "#F5F3FF" },
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

function entityToScreen(entityType: string | null): Screen | undefined {
  if (!entityType) return undefined;
  if (entityType === "event" || entityType === "calendar") return "calendar";
  if (entityType === "task") return "tasks";
  if (entityType === "shopping" || entityType === "shopping_item" || entityType === "shopping_session")
    return "shopping";
  if (entityType === "family" || entityType === "invitation") return "family";
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
    n.type === "family"
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
