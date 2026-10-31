"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LogIn,
  Sparkles,
} from "lucide-react";
import { DEFAULT_BRAND_COLOR, errorText, textOn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";

export default function InvitationAccept({
  token,
  lang,
  t,
  roles,
  errors,
}: {
  token: string;
  lang: string;
  t: any;
  roles: Record<string, string>;
  errors: Record<string, string>;
}) {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const invitation = useQuery(api.invitations.getByToken, { token });
  const acceptInvitation = useMutation(api.invitations.accept);

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [acceptedWorkspaceName, setAcceptedWorkspaceName] = useState("");
  const [acceptedRole, setAcceptedRole] = useState("");
  const [acceptedBrandColor, setAcceptedBrandColor] =
    useState(DEFAULT_BRAND_COLOR);

  const handleAccept = async () => {
    if (!user?.id) return;
    setAccepting(true);
    setError("");
    try {
      await acceptInvitation({
        token,
        displayName: user.fullName ?? user.firstName ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      });
      // Capture workspace details before clearing invitation
      const wName = (invitation as any)?.workspace?.name ?? "Workspace";
      const wColor =
        (invitation as any)?.workspace?.brandingColor ?? DEFAULT_BRAND_COLOR;
      const wRole = (invitation as any)?.role ?? "member";
      setAcceptedWorkspaceName(wName);
      setAcceptedBrandColor(wColor);
      setAcceptedRole(wRole);
      setSuccess(true);
    } catch (err: any) {
      setError(errorText(err, errors, t.acceptFailed));
    } finally {
      setAccepting(false);
    }
  };

  if (!isLoaded || invitation === undefined) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="min-h-screen flex items-center justify-center"
      >
        <div className="w-8 h-8 border-2 border-dark border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invitation || invitation.status === "revoked") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle
            className="w-12 h-12 text-red-400 mx-auto mb-4"
            aria-hidden
          />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t.invalidTitle}
          </h1>
          <p className="text-sm text-gray-600">{t.invalidText}</p>
          <Link
            href={`/${lang}`}
            className="inline-block mt-6 text-sm font-medium text-dark underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t.home}
          </Link>
        </div>
      </div>
    );
  }

  if (invitation.expiresAt < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle
            className="w-12 h-12 text-amber-400 mx-auto mb-4"
            aria-hidden
          />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t.expiredTitle}
          </h1>
          <p className="text-sm text-gray-600">{t.expiredText}</p>
          <Link
            href={`/${lang}`}
            className="inline-block mt-6 text-sm font-medium text-dark underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t.home}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0f4f8]">
        <div className="bg-white border border-gray-100 rounded-2xl p-10 max-w-md w-full text-center shadow-[0_4px_20px_-5px_rgba(0,0,0,0.08)] flex flex-col items-center gap-5">
          <div
            aria-hidden
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
            style={{
              backgroundColor: acceptedBrandColor,
              color: textOn(acceptedBrandColor),
            }}
          >
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900">{t.welcome}</h1>
            <p className="text-sm text-gray-600">
              {t.joined}{" "}
              <span className="font-semibold text-gray-800">
                {acceptedWorkspaceName}
              </span>
            </p>
          </div>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
            style={{
              backgroundColor: acceptedBrandColor,
              color: textOn(acceptedBrandColor),
            }}
          >
            {roles[acceptedRole] ?? acceptedRole}
          </span>
          <button
            type="button"
            onClick={() => router.push(`/${lang}/dashboard`)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{
              backgroundColor: acceptedBrandColor,
              color: textOn(acceptedBrandColor),
            }}
          >
            {t.goToDashboard}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  const workspaceName = (invitation as any).workspace?.name ?? "Workspace";
  const brandColor =
    (invitation as any).workspace?.brandingColor ?? DEFAULT_BRAND_COLOR;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0f4f8]">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-md w-full shadow-[0_4px_20px_-5px_rgba(0,0,0,0.08)]">
        <div
          aria-hidden
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-6"
          style={{ backgroundColor: brandColor, color: textOn(brandColor) }}
        >
          {workspaceName[0].toUpperCase()}
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">
          {t.title}
        </h1>
        <p className="text-sm text-center text-gray-600 mb-6">
          {t.invitedTo}{" "}
          <span className="font-semibold text-gray-800">{workspaceName}</span>{" "}
          {t.as}{" "}
          <span className="font-medium">
            {roles[invitation.role] ?? invitation.role}
          </span>
          .
        </p>

        {!user ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">{t.loginPrompt}</p>
            <SignInButton
              mode="modal"
              forceRedirectUrl={`/${lang}/join/${token}`}
            >
              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{
                  backgroundColor: brandColor,
                  color: textOn(brandColor),
                }}
              >
                <LogIn className="w-4 h-4" aria-hidden />
                {t.login}
              </button>
            </SignInButton>
          </div>
        ) : (
          <div>
            {error && (
              <p role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-xs text-red-600 text-center mb-3">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{ backgroundColor: brandColor, color: textOn(brandColor) }}
            >
              {accepting ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" aria-hidden />
              )}
              {t.accept}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
