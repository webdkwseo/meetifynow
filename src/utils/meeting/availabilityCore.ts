/**
 * Pure availability logic — no Convex SDK imports.
 * Shared between convex/availability.ts and unit tests.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DayRule = {
  dayOfWeek: number; // 0=Sun … 6=Sat
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

export type AvailabilityRules = {
  timezone: string;
  weeklySchedule: DayRule[];
  bufferBefore: number; // minutes
  bufferAfter: number; // minutes
  minNotice: number; // minutes
  maxHorizon: number; // days
};

export type AvailabilityException = {
  dateStr: string; // "YYYY-MM-DD"
  type: "blocked" | "custom";
  customStartHour?: number;
  customStartMinute?: number;
  customEndHour?: number;
  customEndMinute?: number;
};

export type ConfirmedMeeting = {
  finalDate: number;
  durationMinutes: number;
};

// ─── Defaults ────────────────────────────────────────────────────────────────

export function defaultRules(): AvailabilityRules {
  const weeklySchedule: DayRule[] = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
    dayOfWeek: dow,
    enabled: dow >= 1 && dow <= 5, // Mon–Fri
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
  }));
  return {
    timezone: "Europe/Warsaw",
    weeklySchedule,
    bufferBefore: 15,
    bufferAfter: 15,
    minNotice: 60,
    maxHorizon: 90,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Extract local date parts from a UTC timestamp for the given timezone. */
export function getLocalParts(ts: number, tz: string) {
  const d = new Date(ts);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    parts[p.type] = p.value;
  }
  const hour = parts.hour === "24" ? 0 : parseInt(parts.hour, 10);
  return {
    dayOfWeek: WEEKDAY_MAP[parts.weekday] ?? 0,
    hour,
    minute: parseInt(parts.minute, 10),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

// ─── Core availability check ──────────────────────────────────────────────────

/**
 * Check whether a specific timestamp slot is available.
 *
 * @param rules       User's availability rules — null means no restrictions.
 * @param exceptions  Per-date overrides.
 * @param confirmed   Other confirmed meetings used for buffer conflict check.
 * @param slotStart   UTC timestamp for the proposed slot start.
 * @param slotDurationMinutes  Default 60 min.
 * @param now         Current time — injectable for testing.
 */
export function isSlotAvailable(
  rules: AvailabilityRules | null,
  exceptions: AvailabilityException[],
  confirmed: ConfirmedMeeting[],
  slotStart: number,
  slotDurationMinutes = 60,
  now = Date.now(),
): boolean {
  if (!rules) return true;

  const {
    timezone,
    weeklySchedule,
    bufferBefore,
    bufferAfter,
    minNotice,
    maxHorizon,
  } = rules;

  // 1. Min notice
  if (slotStart < now + minNotice * 60_000) return false;

  // 2. Max horizon
  if (slotStart > now + maxHorizon * 24 * 60 * 60_000) return false;

  const {
    dayOfWeek,
    hour: slotHour,
    minute: slotMinute,
    dateStr,
  } = getLocalParts(slotStart, timezone);

  const slotEndTs = slotStart + slotDurationMinutes * 60_000;
  const slotEndParts = getLocalParts(slotEndTs, timezone);
  const slotStartMin = slotHour * 60 + slotMinute;
  const slotEndMin = slotEndParts.hour * 60 + slotEndParts.minute;

  // 3. Exception check
  const exception = exceptions.find((e) => e.dateStr === dateStr);
  if (exception) {
    if (exception.type === "blocked") return false;
    if (exception.type === "custom") {
      const customStart =
        (exception.customStartHour ?? 0) * 60 +
        (exception.customStartMinute ?? 0);
      const customEnd =
        (exception.customEndHour ?? 23) * 60 +
        (exception.customEndMinute ?? 59);
      if (slotStartMin < customStart || slotEndMin > customEnd) return false;
    }
  } else {
    // 4. Weekly schedule check
    const dayRule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!dayRule || !dayRule.enabled) return false;

    const windowStart = dayRule.startHour * 60 + dayRule.startMinute;
    const windowEnd = dayRule.endHour * 60 + dayRule.endMinute;

    if (slotStartMin < windowStart || slotEndMin > windowEnd) return false;
  }

  // 5. Buffer conflict check against confirmed meetings
  for (const { finalDate, durationMinutes } of confirmed) {
    const existingEnd = finalDate + durationMinutes * 60_000;
    // Slot overlaps or is too close after existing meeting
    if (
      slotStart < existingEnd + bufferAfter * 60_000 &&
      slotStart >= finalDate
    )
      return false;
    // Existing meeting is too close after slot end
    if (
      slotEndTs + bufferBefore * 60_000 > finalDate &&
      slotEndTs <= existingEnd
    )
      return false;
  }

  return true;
}

/**
 * Generate available slot start timestamps within [rangeStart, rangeEnd].
 * Slots are spaced by `stepMinutes` (default 30).
 */
export function getAvailableSlotsInRange(
  rules: AvailabilityRules | null,
  exceptions: AvailabilityException[],
  confirmed: ConfirmedMeeting[],
  rangeStart: number,
  rangeEnd: number,
  slotDurationMinutes = 60,
  stepMinutes = 30,
  now = Date.now(),
): number[] {
  const slots: number[] = [];
  const stepMs = stepMinutes * 60_000;
  for (let t = rangeStart; t <= rangeEnd; t += stepMs) {
    if (
      isSlotAvailable(rules, exceptions, confirmed, t, slotDurationMinutes, now)
    ) {
      slots.push(t);
    }
  }
  return slots;
}
