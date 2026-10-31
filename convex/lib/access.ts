import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Error codes surfaced to the client. Plain `Error` messages are redacted in
 * production, so the UI maps these codes to dictionary strings (`dict.errors`).
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NAME_TOO_SHORT"
  | "NAME_TOO_LONG"
  | "PLACE_TOO_LONG"
  | "LINK_TOO_LONG"
  | "DATES_REQUIRED"
  | "DATES_TOO_MANY"
  | "INVALID_DURATION"
  | "USERNAME_REQUIRED"
  | "USERNAME_TOO_LONG"
  | "USERNAME_TAKEN"
  | "ALREADY_ANSWERED"
  | "ANSWER_NOT_FOUND"
  | "MEETING_CANCELLED"
  | "NO_FINAL_DATE"
  | "SLOT_NOT_IN_POLL"
  | "OUTSIDE_AVAILABILITY"
  | "RATE_LIMITED"
  | "WORKSPACE_NAME_TOO_SHORT"
  | "WORKSPACE_NAME_TOO_LONG"
  | "WORKSPACE_EXISTS"
  | "INVALID_COLOR"
  | "INVALID_EMAIL"
  | "INVALID_TIMEZONE"
  | "INVALID_SCHEDULE"
  | "INVITE_EXISTS"
  | "INVITE_INACTIVE"
  | "INVITE_EXPIRED"
  | "ALREADY_MEMBER"
  | "CANNOT_REMOVE_OWNER";

export function fail(code: ErrorCode): never {
  throw new ConvexError({ code });
}

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Clerk user id of the caller. Existing rows store Clerk ids (`user.id` on the
 * client), which is the JWT `subject`; the app has a single auth issuer.
 */
export async function getUserId(ctx: AnyCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export async function requireUserId(ctx: AnyCtx): Promise<string> {
  const userId = await getUserId(ctx);
  if (!userId) fail("UNAUTHENTICATED");
  return userId;
}

export type Role = "owner" | "admin" | "member";

export async function getWorkspaceRole(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  userId: string | null,
): Promise<Role | null> {
  if (!userId) return null;
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) return null;
  if (workspace.ownerId === userId) return "owner";
  const memberships = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  return memberships.find((m) => m.workspaceId === workspaceId)?.role ?? null;
}

export async function requireWorkspaceAdmin(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
): Promise<string> {
  const userId = await requireUserId(ctx);
  const role = await getWorkspaceRole(ctx, workspaceId, userId);
  if (role !== "owner" && role !== "admin") fail("FORBIDDEN");
  return userId;
}

/** Organizer of the meeting, or an owner/admin of its workspace. */
export async function canManageMeeting(
  ctx: QueryCtx,
  meeting: Doc<"meetings">,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  if (meeting.createdBy === userId) return true;
  if (!meeting.workspaceId) return false;
  const role = await getWorkspaceRole(ctx, meeting.workspaceId, userId);
  return role === "owner" || role === "admin";
}

export async function getMeetingByAppointmentId(
  ctx: QueryCtx,
  appointmentId: string,
): Promise<Doc<"meetings">> {
  const meeting = await ctx.db
    .query("meetings")
    .withIndex("by_appointmentId", (q) => q.eq("appointmentId", appointmentId))
    .unique();
  if (!meeting) fail("NOT_FOUND");
  return meeting;
}

export async function requireManagedMeeting(
  ctx: QueryCtx,
  appointmentId: string,
): Promise<Doc<"meetings">> {
  const userId = await requireUserId(ctx);
  const meeting = await getMeetingByAppointmentId(ctx, appointmentId);
  if (!(await canManageMeeting(ctx, meeting, userId))) fail("FORBIDDEN");
  return meeting;
}

export const DEFAULT_DURATION_MINUTES = 60;

export function pollSlots(meeting: Doc<"meetings">): Set<number> {
  return new Set(meeting.dates.flatMap((d) => d.times));
}

// ─── Reminders ───────────────────────────────────────────────────────────────

const REMINDER_STEPS: Array<{ step: "24h" | "1h"; offset: number }> = [
  { step: "24h", offset: 24 * 60 * 60 * 1000 },
  { step: "1h", offset: 60 * 60 * 1000 },
];

export async function cancelReminderJobs(
  ctx: MutationCtx,
  meetingId: Id<"meetings">,
): Promise<void> {
  const existing = await ctx.db
    .query("reminders")
    .withIndex("by_meetingId", (q) => q.eq("meetingId", meetingId))
    .take(100);
  for (const r of existing) {
    if (r.status !== "scheduled") continue;
    if (r.scheduledJobId) {
      try {
        await ctx.scheduler.cancel(
          r.scheduledJobId as Id<"_scheduled_functions">,
        );
      } catch (_) {}
    }
    await ctx.db.patch(r._id, { status: "cancelled" });
  }
}

/**
 * Confirms a date: stores it, (re)schedules the 24h/1h reminders and emails
 * the organizer and workspace members. Shared by finalize and reschedule.
 */
export async function confirmMeetingDate(
  ctx: MutationCtx,
  meeting: Doc<"meetings">,
  finalDate: number,
  organizerEmail?: string,
): Promise<void> {
  await ctx.db.patch(meeting._id, {
    finalDate,
    closedAt: meeting.closedAt ?? Date.now(),
    ...(organizerEmail ? { organizerEmail } : {}),
  });

  await cancelReminderJobs(ctx, meeting._id);
  const now = Date.now();
  for (const { step, offset } of REMINDER_STEPS) {
    const scheduledFor = finalDate - offset;
    if (scheduledFor <= now) continue;
    const reminderId = await ctx.db.insert("reminders", {
      meetingId: meeting._id,
      step,
      scheduledFor,
      status: "scheduled",
    });
    const jobId = await ctx.scheduler.runAt(
      scheduledFor,
      internal.emails.dispatchReminder,
      { reminderId },
    );
    await ctx.db.patch(reminderId, { scheduledJobId: jobId });
  }

  const recipients = new Set<string>();
  const organizer = organizerEmail ?? meeting.organizerEmail;
  if (organizer) recipients.add(organizer);
  if (meeting.workspaceId) {
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", meeting.workspaceId!),
      )
      .take(200);
    for (const m of members) if (m.invitedEmail) recipients.add(m.invitedEmail);
  }
  if (recipients.size > 0) {
    await ctx.scheduler.runAfter(
      0,
      internal.emails.sendMeetingFinalizedEmails,
      {
        appointmentId: meeting.appointmentId,
        finalDate,
        recipientEmails: Array.from(recipients),
      },
    );
  }
}
