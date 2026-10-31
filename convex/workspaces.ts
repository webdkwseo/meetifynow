import { v } from "convex/values";
import { pendingMembers } from "../src/utils/meeting/participants";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  cancelReminderJobs,
  confirmMeetingDate,
  DEFAULT_DURATION_MINUTES,
  fail,
  getUserId,
  getWorkspaceRole,
  pollSlots,
  requireManagedMeeting,
  requireUserId,
  requireWorkspaceAdmin,
} from "./lib/access";

const FILL_REMINDER_COOLDOWN_MS = 60 * 60 * 1000;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2) fail("WORKSPACE_NAME_TOO_SHORT");
  if (trimmed.length > 60) fail("WORKSPACE_NAME_TOO_LONG");
  return trimmed;
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Workspace owned by the signed-in user. */
export const getOwned = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("workspaces")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first();
  },
});

/** Public: name and branding are shown on meeting pages. */
export const getById = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return null;
    return {
      _id: workspace._id,
      name: workspace.name,
      brandingColor: workspace.brandingColor,
    };
  },
});

/** Members only — the list contains e-mail addresses. */
export const getMembersByWorkspaceId = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!(await getWorkspaceRole(ctx, args.workspaceId, userId))) return [];
    return await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .take(200);
  },
});

/** Workspaces the signed-in user belongs to. */
export const getMemberships = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(50);
    const workspaces = await Promise.all(
      memberships.map((m) => ctx.db.get(m.workspaceId)),
    );
    return workspaces.filter((w) => w !== null);
  },
});

export const getMeetingsByWorkspaceId = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!(await getWorkspaceRole(ctx, args.workspaceId, userId))) return [];
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(500);
    return meetings.map(({ organizerEmail: _e, ...m }) => m);
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    brandingColor: v.optional(v.string()),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = validateName(args.name);
    if (args.brandingColor && !HEX_COLOR.test(args.brandingColor))
      fail("INVALID_COLOR");

    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first();
    if (existing) fail("WORKSPACE_EXISTS");

    const workspaceId = await ctx.db.insert("workspaces", {
      name,
      ownerId: userId,
      brandingColor: args.brandingColor ?? "#004466",
      createdAt: Date.now(),
    });

    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
      displayName: args.displayName,
      imageUrl: args.imageUrl,
      joinedAt: Date.now(),
    });

    return workspaceId;
  },
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    brandingColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.workspaceId);
    const patch: { name?: string; brandingColor?: string } = {};
    if (args.name !== undefined) patch.name = validateName(args.name);
    if (args.brandingColor !== undefined) {
      if (!HEX_COLOR.test(args.brandingColor)) fail("INVALID_COLOR");
      patch.brandingColor = args.brandingColor;
    }
    await ctx.db.patch(args.workspaceId, patch);
    return args.workspaceId;
  },
});

export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.workspaceId);
    const member = await ctx.db.get(args.memberId);
    if (!member || member.workspaceId !== args.workspaceId) fail("NOT_FOUND");
    if (member.role === "owner") fail("CANNOT_REMOVE_OWNER");
    await ctx.db.delete(args.memberId);
  },
});

export const finalizeMeeting = mutation({
  args: {
    appointmentId: v.string(),
    finalDate: v.number(),
    organizerEmail: v.optional(v.string()),
    // The organizer explicitly accepted a slot outside their availability.
    ignoreAvailability: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const meeting = await requireManagedMeeting(ctx, args.appointmentId);
    if (meeting.status === "cancelled") fail("MEETING_CANCELLED");
    if (!pollSlots(meeting).has(args.finalDate)) fail("SLOT_NOT_IN_POLL");

    if (meeting.createdBy && !args.ignoreAvailability) {
      const validation = await ctx.runQuery(
        internal.availability.validateSlot,
        {
          userId: meeting.createdBy,
          slotStart: args.finalDate,
          excludeMeetingId: meeting._id,
          slotDurationMinutes:
            meeting.durationMinutes ?? DEFAULT_DURATION_MINUTES,
        },
      );
      if (!validation.ok) fail("OUTSIDE_AVAILABILITY");
    }

    await confirmMeetingDate(ctx, meeting, args.finalDate, args.organizerEmail);
  },
});

export const clearFinalDate = mutation({
  args: { appointmentId: v.string() },
  handler: async (ctx, args) => {
    const meeting = await requireManagedMeeting(ctx, args.appointmentId);
    if (meeting.status === "cancelled") fail("MEETING_CANCELLED");

    await cancelReminderJobs(ctx, meeting._id);
    await ctx.db.patch(meeting._id, {
      finalDate: undefined,
      closedAt: undefined,
    });
  },
});

export const sendFillReminderEmail = mutation({
  args: { appointmentId: v.string() },
  handler: async (ctx, args) => {
    const meeting = await requireManagedMeeting(ctx, args.appointmentId);
    if (!meeting.workspaceId) fail("NOT_FOUND");
    if (
      meeting.lastFillReminderAt &&
      Date.now() - meeting.lastFillReminderAt < FILL_REMINDER_COOLDOWN_MS
    )
      fail("RATE_LIMITED");

    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", meeting.workspaceId!),
      )
      .take(200);

    const recipientEmails = pendingMembers(members, meeting.answers)
      .map((m) => m.invitedEmail)
      .filter((e): e is string => !!e);

    if (recipientEmails.length === 0) return { sent: 0 };

    await ctx.db.patch(meeting._id, { lastFillReminderAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.emails.sendFillReminder, {
      appointmentId: meeting.appointmentId,
      recipientEmails,
    });

    return { sent: recipientEmails.length };
  },
});
