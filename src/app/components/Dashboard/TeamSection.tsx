"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
  Check,
  Clock,
  Copy,
  Crown,
  Mail,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { errorText, fmt, textOn } from "@/lib/utils";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface Member {
  _id: Id<"workspaceMembers">;
  userId: string;
  role: "owner" | "admin" | "member";
  invitedEmail?: string;
  displayName?: string;
  imageUrl?: string;
  joinedAt: number;
}

interface Workspace {
  _id: Id<"workspaces">;
  name: string;
  brandingColor?: string;
}

function getMemberDisplayName(m: Member, t: any): string {
  if (m.displayName) return m.displayName;
  if (m.invitedEmail) return m.invitedEmail;
  return fmt(t.unknownUser, { id: m.userId.slice(-6).toUpperCase() });
}

function getInitials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function TeamSection({
  t,
  roles,
  workspace,
  members,
  currentUserId,
  brandColor,
  lang,
  errors,
  onRemove,
}: {
  t: any;
  roles: Record<string, string>;
  workspace: Workspace;
  members: Member[];
  currentUserId: string;
  brandColor: string;
  lang: "pl" | "en";
  errors: Record<string, string>;
  onRemove: (
    workspaceId: Id<"workspaces">,
    memberId: Id<"workspaceMembers">,
  ) => void;
}) {
  const invitations = useQuery(api.invitations.getByWorkspaceId, {
    workspaceId: workspace._id,
  });

  const createAndSend = useAction(api.invitations.createAndSend);
  const resendAndSend = useAction(api.invitations.resendAndSend);
  const revokeInvitation = useMutation(api.invitations.revoke);
  const confirm = useConfirm();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const brandText = textOn(brandColor);
  const inviteBaseUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${lang}/join`;
  const buildInviteUrl = (token: string) => `${inviteBaseUrl}/${token}`;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setInviteError(t.invalidEmail);
      return;
    }
    setInviteError("");
    setInviting(true);
    setNewToken(null);
    setEmailSent(null);
    try {
      const result = await createAndSend({
        workspaceId: workspace._id,
        email,
        role,
        lang,
      });
      setEmailSent(email);
      setNewToken(result.token);
      setEmail("");
    } catch (err: any) {
      setInviteError(errorText(err, errors, t.inviteFailed));
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (inv: {
    _id: Id<"invitations">;
    token: string;
    email: string;
  }) => {
    setResendingId(inv._id);
    try {
      await resendAndSend({ invitationId: inv._id, lang });
    } catch (e) {
      setInviteError(errorText(e, errors, t.inviteFailed));
    } finally {
      setResendingId(null);
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(buildInviteUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const pendingInvitations = (invitations ?? []).filter(
    (i: { status: string }) => i.status === "pending",
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Active members */}
      <div className="bg-white/90 border border-gray-100/80 rounded-2xl p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          {fmt(t.members, { count: members.length })}
        </h3>
        <ul className="flex flex-col divide-y divide-gray-100/80">
          {members.map((m) => {
            const displayName = getMemberDisplayName(m, t);
            return (
              <li
                key={m._id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  {m.imageUrl ? (
                    <img
                      src={m.imageUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                      style={{ backgroundColor: brandColor, color: brandText }}
                    >
                      {getInitials(displayName)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1">
                      {m.role === "owner" && (
                        <Crown className="w-3 h-3 text-amber-500" aria-hidden />
                      )}
                      <span className="text-xs text-gray-500">
                        {roles[m.role] ?? m.role}
                      </span>
                    </div>
                  </div>
                </div>
                {m.role !== "owner" && m.userId !== currentUserId && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: fmt(t.confirmRemove, { name: displayName }),
                          confirmLabel: t.remove,
                          destructive: true,
                        })
                      )
                        onRemove(workspace._id, m._id);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title={t.remove}
                    aria-label={`${t.remove}: ${displayName}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white/90 border border-gray-100/80 rounded-2xl p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" aria-hidden />
            {fmt(t.pendingInvites, { count: pendingInvitations.length })}
          </h3>
          <ul className="flex flex-col divide-y divide-gray-50">
            {pendingInvitations.map((inv) => (
              <li
                key={inv._id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {inv.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    {roles[inv.role] ?? inv.role} ·{" "}
                    {fmt(t.expires, {
                      date: new Date(inv.expiresAt).toLocaleDateString(lang),
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyLink(inv.token)}
                    title={t.copyInvite}
                    aria-label={t.copyInvite}
                    className="p-1.5 text-gray-500 hover:text-dark transition-colors rounded-lg hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {copiedToken === inv.token ? (
                      <Check className="w-4 h-4 text-green-600" aria-hidden />
                    ) : (
                      <Copy className="w-4 h-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResend(inv)}
                    disabled={resendingId === inv._id}
                    title={t.resend}
                    aria-label={t.resend}
                    className="p-1.5 text-gray-500 hover:text-dark transition-colors rounded-lg hover:bg-primary/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {resendingId === inv._id ? (
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                    ) : (
                      <RefreshCw className="w-4 h-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: fmt(t.confirmRevoke, { email: inv.email }),
                          confirmLabel: t.revoke,
                          destructive: true,
                        })
                      )
                        revokeInvitation({ invitationId: inv._id }).catch((e) =>
                          setInviteError(errorText(e, errors, t.inviteFailed)),
                        );
                    }}
                    title={t.revoke}
                    aria-label={t.revoke}
                    className="p-1.5 text-gray-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success banner — shown after invite creation */}
      {newToken && emailSent && (
        <div
          role="status"
          className="animate-in fade-in-0 slide-in-from-top-1 duration-300 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
            <p className="text-sm font-medium text-emerald-800">
              {t.sentTo} <span className="font-semibold">{emailSent}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-emerald-700 truncate font-mono bg-emerald-100 px-2 py-1 rounded flex-1">
              {buildInviteUrl(newToken)}
            </p>
            <button
              type="button"
              onClick={() => copyLink(newToken)}
              className="shrink-0 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {copiedToken === newToken ? t.copied : t.copy}
            </button>
          </div>
        </div>
      )}

      {/* Invite form */}
      <div className="bg-white/90 border border-gray-100/80 rounded-2xl p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <UserPlus
            className="w-4 h-4"
            style={{ color: brandColor }}
            aria-hidden
          />
          {t.inviteTitle}
        </h3>
        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-3"
          noValidate
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="invite-email" className="sr-only">
              {t.emailLabel}
            </label>
            <input
              id="invite-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!inviteError || undefined}
              aria-describedby={inviteError ? "invite-error" : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <label htmlFor="invite-role" className="sr-only">
              {t.roleLabel}
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="member">{roles.member}</option>
              <option value="admin">{roles.admin}</option>
            </select>
          </div>
          {inviteError && (
            <p id="invite-error" role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-xs text-red-600">
              {inviteError}
            </p>
          )}
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{ backgroundColor: brandColor, color: brandText }}
          >
            {inviting ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mail className="w-4 h-4" aria-hidden />
            )}
            {inviting ? t.sending : t.send}
          </button>
        </form>
      </div>
    </div>
  );
}
