import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ---------------------------------------------------------------------------
// Query — used by dispatchReminder in emails.ts
// ---------------------------------------------------------------------------

export const getWithMeeting = internalQuery({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) return null;
    const meeting = await ctx.db.get(reminder.meetingId);
    if (!meeting) return null;
    return { reminder, meeting };
  },
});

// ---------------------------------------------------------------------------
// Mutations — idempotency locks, called from emails.ts dispatchReminder
// ---------------------------------------------------------------------------

export const markSent = internalMutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, {
      status: "sent",
      sentAt: Date.now(),
    });
  },
});

export const markCancelled = internalMutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, { status: "cancelled" });
  },
});
