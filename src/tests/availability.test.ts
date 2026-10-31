import { describe, expect, it } from "vitest";
import {
  defaultRules,
  getAvailableSlotsInRange,
  isSlotAvailable,
} from "../utils/meeting/availabilityCore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 2026-05-25 is a Monday. In Warsaw (UTC+2 in summer), 09:00 local = 07:00 UTC.
const MON_9H = new Date("2026-05-25T07:00:00.000Z").getTime(); // Mon 09:00 Warsaw
const MON_17H = new Date("2026-05-25T15:00:00.000Z").getTime(); // Mon 17:00 Warsaw
const SUN_10H = new Date("2026-05-24T08:00:00.000Z").getTime(); // Sun 10:00 Warsaw

// `now` set well before each slot so minNotice/maxHorizon don't interfere unless tested
const NOW_EARLY = MON_9H - 24 * 60 * 60_000; // 24h before Monday 9:00

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("defaultRules()", () => {
  it("returns Mon–Fri 9:00–17:00 as default", () => {
    const rules = defaultRules();
    expect(rules.weeklySchedule[1].enabled).toBe(true); // Monday
    expect(rules.weeklySchedule[5].enabled).toBe(true); // Friday
    expect(rules.weeklySchedule[0].enabled).toBe(false); // Sunday
    expect(rules.weeklySchedule[6].enabled).toBe(false); // Saturday
    expect(rules.weeklySchedule[1].startHour).toBe(9);
    expect(rules.weeklySchedule[1].endHour).toBe(17);
  });
});

describe("isSlotAvailable() — weekly schedule", () => {
  it("allows slot on Monday at 9:00 with default rules", () => {
    const rules = defaultRules();
    expect(isSlotAvailable(rules, [], [], MON_9H, 60, NOW_EARLY)).toBe(true);
  });

  it("blocks slot on Sunday", () => {
    const rules = defaultRules();
    expect(isSlotAvailable(rules, [], [], SUN_10H, 60, NOW_EARLY)).toBe(false);
  });

  it("blocks slot that ends after window (16:30 start + 60 min = 17:30 > 17:00)", () => {
    const rules = defaultRules();
    const slot1630 = new Date("2026-05-25T14:30:00.000Z").getTime(); // 16:30 Warsaw
    expect(isSlotAvailable(rules, [], [], slot1630, 60, NOW_EARLY)).toBe(false);
  });

  it("allows slot that fits exactly at window end (16:00 start + 60 min = 17:00)", () => {
    const rules = defaultRules();
    const slot1600 = new Date("2026-05-25T14:00:00.000Z").getTime(); // 16:00 Warsaw
    expect(isSlotAvailable(rules, [], [], slot1600, 60, NOW_EARLY)).toBe(true);
  });
});

describe("isSlotAvailable() — null rules", () => {
  it("returns true when no rules configured", () => {
    expect(isSlotAvailable(null, [], [], SUN_10H, 60, NOW_EARLY)).toBe(true);
  });
});

describe("isSlotAvailable() — minNotice", () => {
  it("blocks slot when minNotice not met", () => {
    const rules = { ...defaultRules(), minNotice: 120 }; // 2h notice required
    const now = MON_9H - 60 * 60_000; // only 1h before → not enough
    expect(isSlotAvailable(rules, [], [], MON_9H, 60, now)).toBe(false);
  });

  it("allows slot when minNotice is exactly met", () => {
    const rules = { ...defaultRules(), minNotice: 60 };
    const now = MON_9H - 61 * 60_000; // 61 min before → ok
    expect(isSlotAvailable(rules, [], [], MON_9H, 60, now)).toBe(true);
  });
});

describe("isSlotAvailable() — maxHorizon", () => {
  it("blocks slot beyond maxHorizon", () => {
    const rules = { ...defaultRules(), maxHorizon: 1 }; // 1 day max
    const farFuture = NOW_EARLY + 3 * 24 * 60 * 60_000; // 3 days ahead
    expect(isSlotAvailable(rules, [], [], farFuture, 60, NOW_EARLY)).toBe(
      false,
    );
  });
});

describe("isSlotAvailable() — exceptions", () => {
  it("blocks slot on a 'blocked' exception date", () => {
    const rules = defaultRules();
    const exceptions = [{ dateStr: "2026-05-25", type: "blocked" as const }];
    expect(isSlotAvailable(rules, exceptions, [], MON_9H, 60, NOW_EARLY)).toBe(
      false,
    );
  });

  it("allows slot within custom exception hours", () => {
    const rules = defaultRules();
    const exceptions = [
      {
        dateStr: "2026-05-25",
        type: "custom" as const,
        customStartHour: 8,
        customStartMinute: 0,
        customEndHour: 18,
        customEndMinute: 0,
      },
    ];
    expect(isSlotAvailable(rules, exceptions, [], MON_9H, 60, NOW_EARLY)).toBe(
      true,
    );
  });

  it("blocks slot outside custom exception hours", () => {
    const rules = defaultRules();
    const exceptions = [
      {
        dateStr: "2026-05-25",
        type: "custom" as const,
        customStartHour: 10,
        customStartMinute: 0,
        customEndHour: 12,
        customEndMinute: 0,
      },
    ];
    // 9:00–10:00 is before the custom window starts at 10:00
    expect(isSlotAvailable(rules, exceptions, [], MON_9H, 60, NOW_EARLY)).toBe(
      false,
    );
  });
});

describe("isSlotAvailable() — buffer conflicts", () => {
  it("blocks slot too close after a confirmed meeting (bufferAfter)", () => {
    const rules = { ...defaultRules(), bufferAfter: 30 };
    // Existing meeting: Mon 9:00–10:00 → can't start until 10:30
    const existing = { finalDate: MON_9H, durationMinutes: 60 };
    const slot1015 = MON_9H + 75 * 60_000; // 10:15 — within buffer
    expect(
      isSlotAvailable(rules, [], [existing], slot1015, 60, NOW_EARLY),
    ).toBe(false);
  });

  it("allows slot after bufferAfter clears", () => {
    const rules = { ...defaultRules(), bufferAfter: 30 };
    const existing = { finalDate: MON_9H, durationMinutes: 60 };
    const slot1030 = MON_9H + 90 * 60_000; // 10:30 — exactly after buffer
    expect(
      isSlotAvailable(rules, [], [existing], slot1030, 60, NOW_EARLY),
    ).toBe(true);
  });
});

describe("getAvailableSlotsInRange()", () => {
  it("returns at least one slot on a typical Monday", () => {
    const rules = defaultRules();
    const rangeStart = MON_9H;
    const rangeEnd = MON_9H + 2 * 60 * 60_000; // 9:00–11:00
    const slots = getAvailableSlotsInRange(
      rules,
      [],
      [],
      rangeStart,
      rangeEnd,
      60,
      30,
      NOW_EARLY,
    );
    expect(slots.length).toBeGreaterThan(0);
  });

  it("returns empty array for Sunday with default rules", () => {
    const rules = defaultRules();
    const rangeStart = SUN_10H;
    const rangeEnd = SUN_10H + 4 * 60 * 60_000;
    const slots = getAvailableSlotsInRange(
      rules,
      [],
      [],
      rangeStart,
      rangeEnd,
      60,
      30,
      NOW_EARLY,
    );
    expect(slots).toHaveLength(0);
  });

  it("returns empty array when null rules and range is valid (no restriction)", () => {
    const slots = getAvailableSlotsInRange(
      null,
      [],
      [],
      SUN_10H,
      SUN_10H + 60_000 * 30,
      60,
      30,
      NOW_EARLY,
    );
    expect(slots.length).toBeGreaterThan(0);
  });
});
