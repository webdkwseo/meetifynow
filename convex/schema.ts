import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(),
    brandingColor: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_ownerId", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    invitedEmail: v.optional(v.string()),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    joinedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"]),

  meetings: defineTable({
    appointmentId: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.string()),
    meetName: v.string(),
    meetPlace: v.optional(v.string()),
    meetLink: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    finalDate: v.optional(v.number()),
    dates: v.array(
      v.object({
        date: v.number(),
        times: v.array(v.number()),
      }),
    ),
    answers: v.array(
      v.object({
        id: v.optional(v.string()),
        // Clerk id when the participant answered while signed in
        userId: v.optional(v.string()),
        username: v.string(),
        respondedAt: v.optional(v.number()),
        dates: v.array(
          v.object({
            meetDate: v.number(),
            isOnline: v.boolean(),
          }),
        ),
      }),
    ),
    requiredParticipants: v.optional(v.array(v.string())),
    clonedFromId: v.optional(v.id("meetings")),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("cancelled"),
        v.literal("completed"),
        v.literal("no_show"),
      ),
    ),
    organizerEmail: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    // IANA zone of the organizer's browser; used to show times in e-mails
    timezone: v.optional(v.string()),
    lang: v.optional(v.union(v.literal("pl"), v.literal("en"))),
    durationMinutes: v.optional(v.number()),
    lastFillReminderAt: v.optional(v.number()),
  })
    .index("by_appointmentId", ["appointmentId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_createdBy", ["createdBy"]),

  reminders: defineTable({
    meetingId: v.id("meetings"),
    step: v.union(v.literal("24h"), v.literal("1h")),
    scheduledFor: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("cancelled"),
    ),
    scheduledJobId: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  }).index("by_meetingId", ["meetingId"]),

  invitations: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    token: v.string(),
    invitedBy: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_email", ["email"]),

  // Sprint 6 — Availability rules ─────────────────────────────────────────
  availabilityRules: defineTable({
    userId: v.string(),
    timezone: v.string(),
    weeklySchedule: v.array(
      v.object({
        dayOfWeek: v.number(), // 0=Sun … 6=Sat
        enabled: v.boolean(),
        startHour: v.number(),
        startMinute: v.number(),
        endHour: v.number(),
        endMinute: v.number(),
      }),
    ),
    bufferBefore: v.number(), // minutes between end of prev meeting and new start
    bufferAfter: v.number(), // minutes after new meeting end
    minNotice: v.number(), // min minutes from now before slot can be booked
    maxHorizon: v.number(), // max days into the future a slot can be booked
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  availabilityExceptions: defineTable({
    userId: v.string(),
    dateStr: v.string(), // "YYYY-MM-DD" in the user's local timezone
    type: v.union(v.literal("blocked"), v.literal("custom")),
    // Used only when type === "custom" — override hours for this specific day
    customStartHour: v.optional(v.number()),
    customStartMinute: v.optional(v.number()),
    customEndHour: v.optional(v.number()),
    customEndMinute: v.optional(v.number()),
    reason: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "dateStr"]),
});
