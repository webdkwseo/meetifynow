import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  action,
  ActionCtx,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import {
  fail,
  getUserId,
  getWorkspaceRole,
  requireUserId,
  requireWorkspaceAdmin,
} from "./lib/access";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const lang = v.union(v.literal("pl"), v.literal("en"));

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type InviteMailData = {
  email: string;
  token: string;
  role: "admin" | "member";
  workspaceName: string;
};

// Internal mutation — checks the actor's role, creates the invitation
export const internalCreate = internalMutation({
  args: {
    actorId: v.string(),
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args): Promise<InviteMailData> => {
    const role = await getWorkspaceRole(ctx, args.workspaceId, args.actorId);
    if (role !== "owner" && role !== "admin") fail("FORBIDDEN");
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) fail("NOT_FOUND");

    const email = args.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("INVALID_EMAIL");

    const sameEmail = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(50);
    if (
      sameEmail.some(
        (i) => i.workspaceId === args.workspaceId && i.status === "pending",
      )
    )
      fail("INVITE_EXISTS");

    const token = generateToken();
    await ctx.db.insert("invitations", {
      workspaceId: args.workspaceId,
      email,
      role: args.role,
      token,
      invitedBy: args.actorId,
      status: "pending",
      expiresAt: Date.now() + INVITE_TTL_MS,
      createdAt: Date.now(),
    });

    return { email, token, role: args.role, workspaceName: workspace.name };
  },
});

// Internal mutation — refreshes expiry and returns data for re-sending
export const internalResend = internalMutation({
  args: { actorId: v.string(), invitationId: v.id("invitations") },
  handler: async (ctx, args): Promise<InviteMailData> => {
    const inv = await ctx.db.get(args.invitationId);
    if (!inv) fail("NOT_FOUND");
    const role = await getWorkspaceRole(ctx, inv.workspaceId, args.actorId);
    if (role !== "owner" && role !== "admin") fail("FORBIDDEN");
    if (inv.status === "accepted") fail("INVITE_INACTIVE");
    const workspace = await ctx.db.get(inv.workspaceId);
    await ctx.db.patch(args.invitationId, {
      status: "pending",
      expiresAt: Date.now() + INVITE_TTL_MS,
    });
    return {
      email: inv.email,
      token: inv.token,
      role: inv.role,
      workspaceName: workspace?.name ?? "",
    };
  },
});

async function sendInvite(
  ctx: ActionCtx,
  data: InviteMailData,
  inviterName: string,
  mailLang: "pl" | "en",
) {
  // Fire-and-forget: email failure must not break invitation creation
  try {
    await ctx.runAction(internal.emails.sendInvitationEmail, {
      toEmail: data.email,
      inviterName,
      workspaceName: data.workspaceName,
      role: data.role,
      token: data.token,
      lang: mailLang,
    });
  } catch (e) {
    console.warn("[invitations] Email delivery failed:", e);
  }
}

// Public action — creates invitation + sends invitation email
export const createAndSend = action({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    lang,
  },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED");
    const data: InviteMailData = await ctx.runMutation(
      internal.invitations.internalCreate,
      {
        actorId: identity.subject,
        workspaceId: args.workspaceId,
        email: args.email,
        role: args.role,
      },
    );
    await sendInvite(ctx, data, identity.name ?? "MeetifyNow", args.lang);
    return { token: data.token };
  },
});

// Public action — refreshes invitation + re-sends email
export const resendAndSend = action({
  args: { invitationId: v.id("invitations"), lang },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED");
    const data: InviteMailData = await ctx.runMutation(
      internal.invitations.internalResend,
      { actorId: identity.subject, invitationId: args.invitationId },
    );
    await sendInvite(ctx, data, identity.name ?? "MeetifyNow", args.lang);
  },
});

/** The token itself is the capability; the invitee may not be a member yet. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invitation) return null;

    const workspace = await ctx.db.get(invitation.workspaceId);
    return {
      _id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      workspace: workspace
        ? { name: workspace.name, brandingColor: workspace.brandingColor }
        : null,
    };
  },
});

/** Owners/admins only — the rows hold tokens that grant membership. */
export const getByWorkspaceId = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const role = await getWorkspaceRole(ctx, args.workspaceId, userId);
    if (role !== "owner" && role !== "admin") return [];
    return await ctx.db
      .query("invitations")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(200);
  },
});

export const accept = mutation({
  args: {
    token: v.string(),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"workspaces">> => {
    const userId = await requireUserId(ctx);
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) fail("NOT_FOUND");
    if (invitation.status !== "pending") fail("INVITE_INACTIVE");
    if (invitation.expiresAt < Date.now()) fail("INVITE_EXPIRED");
    if (await getWorkspaceRole(ctx, invitation.workspaceId, userId))
      fail("ALREADY_MEMBER");

    await ctx.db.insert("workspaceMembers", {
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
      invitedEmail: invitation.email,
      displayName: args.displayName,
      imageUrl: args.imageUrl,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(invitation._id, { status: "accepted" });
    return invitation.workspaceId;
  },
});

export const revoke = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invitationId);
    if (!inv) fail("NOT_FOUND");
    await requireWorkspaceAdmin(ctx, inv.workspaceId);
    await ctx.db.patch(args.invitationId, { status: "revoked" });
  },
});
