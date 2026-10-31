import { v } from "convex/values";
import {
  defaultRules,
  getAvailableSlotsInRange,
  isSlotAvailable,
  type AvailabilityRules,
} from "../src/utils/meeting/availabilityCore";
import { internalQuery, mutation, query } from "./_generated/server";
import {
  DEFAULT_DURATION_MINUTES,
  fail,
  getUserId,
  requireUserId,
} from "./lib/access";

export { defaultRules, getAvailableSlotsInRange, isSlotAvailable };
export type { AvailabilityRules };

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getAvailabilityRules = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("availabilityRules")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getExceptions = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const exceptions = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(500);
    // Other people (e.g. meeting participants) only need the dates, not the reasons.
    if ((await getUserId(ctx)) === args.userId) return exceptions;
    return exceptions.map(({ reason: _reason, ...rest }) => rest);
  },
});

export const getAvailableSlots = query({
  args: {
    userId: v.string(),
    rangeStart: v.number(),
    rangeEnd: v.number(),
    slotDurationMinutes: v.optional(v.number()),
    stepMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rulesDoc = await ctx.db
      .query("availabilityRules")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const rules: AvailabilityRules | null = rulesDoc
      ? {
          timezone: rulesDoc.timezone,
          weeklySchedule: rulesDoc.weeklySchedule,
          bufferBefore: rulesDoc.bufferBefore,
          bufferAfter: rulesDoc.bufferAfter,
          minNotice: rulesDoc.minNotice,
          maxHorizon: rulesDoc.maxHorizon,
        }
      : null;

    const exceptions = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const confirmedMeetings = await ctx.db
      .query("meetings")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();

    const confirmed = confirmedMeetings
      .filter((m) => m.finalDate && m.status !== "cancelled")
      .map((m) => ({
        finalDate: m.finalDate as number,
        durationMinutes: m.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      }));

    return getAvailableSlotsInRange(
      rules,
      exceptions,
      confirmed,
      args.rangeStart,
      args.rangeEnd,
      args.slotDurationMinutes ?? 60,
      args.stepMinutes ?? 30,
    );
  },
});

export const validateSlot = internalQuery({
  args: {
    userId: v.string(),
    slotStart: v.number(),
    excludeMeetingId: v.optional(v.id("meetings")),
    slotDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rulesDoc = await ctx.db
      .query("availabilityRules")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!rulesDoc) return { ok: true };

    const rules: AvailabilityRules = {
      timezone: rulesDoc.timezone,
      weeklySchedule: rulesDoc.weeklySchedule,
      bufferBefore: rulesDoc.bufferBefore,
      bufferAfter: rulesDoc.bufferAfter,
      minNotice: rulesDoc.minNotice,
      maxHorizon: rulesDoc.maxHorizon,
    };

    const exceptions = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const confirmedMeetings = await ctx.db
      .query("meetings")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();

    const confirmed = confirmedMeetings
      .filter(
        (m) =>
          m.finalDate &&
          m.status !== "cancelled" &&
          m._id !== args.excludeMeetingId,
      )
      .map((m) => ({
        finalDate: m.finalDate as number,
        durationMinutes: m.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      }));

    const available = isSlotAvailable(
      rules,
      exceptions,
      confirmed,
      args.slotStart,
      args.slotDurationMinutes ?? DEFAULT_DURATION_MINUTES,
    );
    return { ok: available };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const upsertAvailabilityRules = mutation({
  args: {
    timezone: v.string(),
    weeklySchedule: v.array(
      v.object({
        dayOfWeek: v.number(),
        enabled: v.boolean(),
        startHour: v.number(),
        startMinute: v.number(),
        endHour: v.number(),
        endMinute: v.number(),
      }),
    ),
    bufferBefore: v.number(),
    bufferAfter: v.number(),
    minNotice: v.number(),
    maxHorizon: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    try {
      new Intl.DateTimeFormat("en", { timeZone: args.timezone });
    } catch {
      fail("INVALID_TIMEZONE");
    }
    const toMin = (h: number, m: number) => h * 60 + m;
    const scheduleValid = args.weeklySchedule.every(
      (d) =>
        d.dayOfWeek >= 0 &&
        d.dayOfWeek <= 6 &&
        (!d.enabled ||
          toMin(d.endHour, d.endMinute) > toMin(d.startHour, d.startMinute)),
    );
    const inRange = (n: number, max: number) => n >= 0 && n <= max;
    if (
      !scheduleValid ||
      !inRange(args.bufferBefore, 240) ||
      !inRange(args.bufferAfter, 240) ||
      !inRange(args.minNotice, 10080) ||
      !inRange(args.maxHorizon, 365)
    )
      fail("INVALID_SCHEDULE");

    const existing = await ctx.db
      .query("availabilityRules")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const payload = {
      userId,
      timezone: args.timezone,
      weeklySchedule: args.weeklySchedule,
      bufferBefore: args.bufferBefore,
      bufferAfter: args.bufferAfter,
      minNotice: args.minNotice,
      maxHorizon: args.maxHorizon,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("availabilityRules", payload);
  },
});

export const addException = mutation({
  args: {
    dateStr: v.string(),
    type: v.union(v.literal("blocked"), v.literal("custom")),
    customStartHour: v.optional(v.number()),
    customStartMinute: v.optional(v.number()),
    customEndHour: v.optional(v.number()),
    customEndMinute: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.dateStr)) fail("INVALID_SCHEDULE");
    const existing = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).eq("dateStr", args.dateStr),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);

    return await ctx.db.insert("availabilityExceptions", {
      userId,
      dateStr: args.dateStr,
      type: args.type,
      customStartHour: args.customStartHour,
      customStartMinute: args.customStartMinute,
      customEndHour: args.customEndHour,
      customEndMinute: args.customEndMinute,
      reason: args.reason,
    });
  },
});

export const removeException = mutation({
  args: {
    exceptionId: v.id("availabilityExceptions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) return;
    if (exception.userId !== userId) fail("FORBIDDEN");
    await ctx.db.delete(args.exceptionId);
  },
});
