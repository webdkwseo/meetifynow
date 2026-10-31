import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query, QueryCtx } from "./_generated/server";
import {
  canManageMeeting,
  cancelReminderJobs,
  confirmMeetingDate,
  fail,
  getMeetingByAppointmentId,
  getUserId,
  getWorkspaceRole,
  pollSlots,
  requireManagedMeeting,
  requireUserId,
} from "./lib/access";

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(7);
  crypto.getRandomValues(array);
  for (const byte of array) result += chars[byte % chars.length];
  return result;
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

const answerDates = v.array(
  v.object({
    meetDate: v.number(),
    isOnline: v.boolean(),
  }),
);

function validateUsername(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) fail("USERNAME_REQUIRED");
  if (trimmed.length > 20) fail("USERNAME_TOO_LONG");
  return trimmed;
}

/** Drops picks that are not part of the poll (trust boundary). */
function onlyPollDates(
  meeting: Doc<"meetings">,
  dates: { meetDate: number; isOnline: boolean }[],
) {
  const slots = pollSlots(meeting);
  return dates.filter((d) => slots.has(d.meetDate));
}

/** Private workspace meetings are visible to workspace members only. */
async function canView(ctx: QueryCtx, meeting: Doc<"meetings">) {
  if (!meeting.isPrivate || !meeting.workspaceId) return true;
  const userId = await getUserId(ctx);
  return (await getWorkspaceRole(ctx, meeting.workspaceId, userId)) !== null;
}

/** The signed-in user's own meetings. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("meetings")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .order("desc")
      .take(500);
  },
});

export const create = mutation({
  args: {
    meetName: v.string(),
    meetPlace: v.optional(v.string()),
    meetLink: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    dates: v.array(
      v.object({
        date: v.number(),
        times: v.array(v.number()),
      }),
    ),
    requiredParticipants: v.optional(v.array(v.string())),
    clonedFromId: v.optional(v.id("meetings")),
    isPrivate: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
    lang: v.optional(v.union(v.literal("pl"), v.literal("en"))),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const meetName = args.meetName.trim();
    if (meetName.length < 2) fail("NAME_TOO_SHORT");
    if (meetName.length > 50) fail("NAME_TOO_LONG");
    if (args.meetPlace && args.meetPlace.length > 100) fail("PLACE_TOO_LONG");
    if (args.meetLink && args.meetLink.length > 200) fail("LINK_TOO_LONG");
    if (args.dates.length === 0) fail("DATES_REQUIRED");
    if (args.dates.length > 15) fail("DATES_TOO_MANY");
    if (
      args.durationMinutes !== undefined &&
      !DURATIONS.includes(args.durationMinutes)
    )
      fail("INVALID_DURATION");

    // Anonymous meetings are allowed; workspace meetings need a member.
    const userId = await getUserId(ctx);
    if (
      args.workspaceId &&
      !(await getWorkspaceRole(ctx, args.workspaceId, userId))
    )
      fail("FORBIDDEN");

    let timezone = args.timezone;
    try {
      if (timezone) new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      timezone = undefined;
    }

    const appointmentId = generateId();
    await ctx.db.insert("meetings", {
      appointmentId,
      meetName,
      meetPlace: args.meetPlace?.trim() || undefined,
      meetLink: args.meetLink?.trim() || undefined,
      workspaceId: args.workspaceId,
      createdBy: userId ?? undefined,
      dates: args.dates,
      answers: [],
      createdAt: Date.now(),
      requiredParticipants:
        args.requiredParticipants && args.requiredParticipants.length > 0
          ? args.requiredParticipants
          : undefined,
      clonedFromId: args.clonedFromId,
      isPrivate: args.isPrivate && args.workspaceId ? true : undefined,
      timezone,
      lang: args.lang,
      durationMinutes: args.durationMinutes,
    });
    return appointmentId;
  },
});

export const getByAppointmentId = query({
  args: { appointmentId: v.string() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db
      .query("meetings")
      .withIndex("by_appointmentId", (q) =>
        q.eq("appointmentId", args.appointmentId),
      )
      .unique();
    if (!meeting || !(await canView(ctx, meeting))) return null;
    // The link is public: never hand out the organizer's address.
    const { organizerEmail: _organizerEmail, ...rest } = meeting;
    return rest;
  },
});

/** Full meeting doc for e-mail actions. */
export const internalGetByAppointmentId = internalQuery({
  args: { appointmentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_appointmentId", (q) =>
        q.eq("appointmentId", args.appointmentId),
      )
      .unique();
  },
});

export const addAnswer = mutation({
  args: {
    appointmentId: v.string(),
    username: v.string(),
    dates: answerDates,
  },
  handler: async (ctx, args) => {
    const username = validateUsername(args.username);
    const meeting = await getMeetingByAppointmentId(ctx, args.appointmentId);
    if (!(await canView(ctx, meeting))) fail("NOT_FOUND");
    if (meeting.status === "cancelled") fail("MEETING_CANCELLED");

    const userId = (await getUserId(ctx)) ?? undefined;
    if (userId && meeting.answers.some((a) => a.userId === userId))
      fail("ALREADY_ANSWERED");
    if (
      meeting.answers.some(
        (a) => a.username.toLowerCase() === username.toLowerCase(),
      )
    )
      fail("USERNAME_TAKEN");

    const answerId = crypto.randomUUID();
    await ctx.db.patch(meeting._id, {
      answers: [
        ...meeting.answers,
        {
          id: answerId,
          userId,
          username,
          dates: onlyPollDates(meeting, args.dates),
          respondedAt: Date.now(),
        },
      ],
    });

    return { answerId };
  },
});

export const updateAnswer = mutation({
  args: {
    appointmentId: v.string(),
    // The answer id is only known to the browser that created the answer.
    answerId: v.string(),
    username: v.string(),
    dates: answerDates,
  },
  handler: async (ctx, args) => {
    const username = validateUsername(args.username);
    const meeting = await getMeetingByAppointmentId(ctx, args.appointmentId);
    if (meeting.status === "cancelled") fail("MEETING_CANCELLED");

    const answerIndex = meeting.answers.findIndex(
      (a) => a.id === args.answerId,
    );
    if (answerIndex === -1) fail("ANSWER_NOT_FOUND");

    if (
      meeting.answers.some(
        (a, idx) =>
          idx !== answerIndex &&
          a.username.toLowerCase() === username.toLowerCase(),
      )
    )
      fail("USERNAME_TAKEN");

    const updatedAnswers = [...meeting.answers];
    updatedAnswers[answerIndex] = {
      ...updatedAnswers[answerIndex],
      username,
      dates: onlyPollDates(meeting, args.dates),
      respondedAt: Date.now(),
    };

    await ctx.db.patch(meeting._id, { answers: updatedAnswers });
    return { success: true };
  },
});

export const cloneAsRecurring = mutation({
  args: { appointmentId: v.string() },
  handler: async (ctx, args) => {
    const source = await requireManagedMeeting(ctx, args.appointmentId);
    const userId = await requireUserId(ctx);

    const newAppointmentId = generateId();
    await ctx.db.insert("meetings", {
      appointmentId: newAppointmentId,
      meetName: source.meetName,
      meetPlace: source.meetPlace,
      meetLink: source.meetLink,
      dates: source.dates,
      answers: [],
      createdAt: Date.now(),
      workspaceId: source.workspaceId,
      createdBy: userId,
      requiredParticipants: source.requiredParticipants,
      clonedFromId: source._id,
      isPrivate: source.isPrivate,
      timezone: source.timezone,
      lang: source.lang,
      durationMinutes: source.durationMinutes,
    });
    return newAppointmentId;
  },
});

export const cancel = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) fail("NOT_FOUND");
    if (!(await canManageMeeting(ctx, meeting, userId))) fail("FORBIDDEN");
    if (meeting.status === "cancelled") return;

    await ctx.db.patch(args.meetingId, { status: "cancelled" });
    await cancelReminderJobs(ctx, meeting._id);

    if (meeting.organizerEmail) {
      await ctx.scheduler.runAfter(0, internal.emails.sendCancellationEmail, {
        toEmail: meeting.organizerEmail,
        appointmentId: meeting.appointmentId,
      });
    }
  },
});

export const updateStatus = mutation({
  args: {
    meetingId: v.id("meetings"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("no_show"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) fail("NOT_FOUND");
    if (!(await canManageMeeting(ctx, meeting, userId))) fail("FORBIDDEN");
    if (meeting.status === "cancelled") fail("MEETING_CANCELLED");
    if (args.status !== "active" && !meeting.finalDate) fail("NO_FINAL_DATE");

    await ctx.db.patch(args.meetingId, { status: args.status });
  },
});

// Organizer-only: linked from the organizer's reminder e-mail.
export const reschedule = mutation({
  args: {
    appointmentId: v.string(),
    newFinalDate: v.number(),
  },
  handler: async (ctx, args) => {
    const meeting = await requireManagedMeeting(ctx, args.appointmentId);
    if (meeting.status === "cancelled") fail("MEETING_CANCELLED");
    if (!pollSlots(meeting).has(args.newFinalDate)) fail("SLOT_NOT_IN_POLL");

    await confirmMeetingDate(ctx, meeting, args.newFinalDate);
  },
});
