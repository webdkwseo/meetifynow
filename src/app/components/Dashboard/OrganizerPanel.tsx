"use client";

import SlidingPill from "@/components/ui/SlidingPill";
import AvailabilitySettings from "@/components/Dashboard/AvailabilitySettings";
import CoordinationDashboard from "@/components/Dashboard/CoordinationDashboard";
import MeetingsTab from "@/components/Dashboard/MeetingsTab";
import TeamSection from "@/components/Dashboard/TeamSection";
import WorkspaceOnboarding from "@/components/Workspace/WorkspaceOnboarding";
import WorkspaceSettings from "@/components/Workspace/WorkspaceSettings";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useUser } from "@/lib/useAppUser";
import { DEFAULT_BRAND_COLOR, textOn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Tab = "meetings" | "overview" | "team" | "settings" | "availability";

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  meetings: <CalendarDays className="w-4 h-4" aria-hidden />,
  overview: <BarChart3 className="w-4 h-4" aria-hidden />,
  team: <Users className="w-4 h-4" aria-hidden />,
  settings: <Settings className="w-4 h-4" aria-hidden />,
  availability: <Clock className="w-4 h-4" aria-hidden />,
};

const TABS_FULL: Tab[] = [
  "meetings",
  "overview",
  "team",
  "settings",
  "availability",
];
const TABS_MEMBER: Tab[] = ["meetings", "overview", "availability"];
const TABS_PERSONAL: Tab[] = ["meetings", "overview", "availability"];

export default function OrganizerPanel({
  lang,
  dict,
}: {
  lang: string;
  dict: any;
}) {
  const t = dict.page.dashboard;
  const { user, isLoaded } = useUser();

  const {
    workspace,
    isOwner,
    members,
    meetings,
    personalMeetings,
    isLoading,
    isCreating,
    error,
    handleCreate,
    handleUpdate,
    handleRemoveMember,
    handleCancelMeeting,
    handleUpdateMeetingStatus,
  } = useWorkspace(user, dict.errors);

  const userId = user?.id;
  const hasWorkspace = workspace !== null;
  const isMember = hasWorkspace && !isOwner;
  const myRole = members.find((m) => m.userId === user?.id)?.role;
  const canManage = isOwner || myRole === "admin";

  const [activeTab, setActiveTab] = useState<Tab>("meetings");
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Keep the active tab in the URL hash so refresh/back keeps the view.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as Tab;
    if (fromHash in TAB_ICONS) setActiveTab(fromHash);
  }, []);
  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    history.replaceState(null, "", `#${tab}`);
  };

  if (!isLoaded || isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex items-center justify-center py-48"
      >
        <div className="w-8 h-8 border-2 border-dark border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const brandColor = workspace?.brandingColor ?? DEFAULT_BRAND_COLOR;
  const brandText = textOn(brandColor);
  const TABS = !hasWorkspace
    ? TABS_PERSONAL
    : isOwner
      ? TABS_FULL
      : TABS_MEMBER;
  const currentTab = TABS.includes(activeTab) ? activeTab : "meetings";
  const visibleMeetings = hasWorkspace
    ? (meetings ?? [])
    : (personalMeetings ?? []);
  // For members: show org meetings + their own personal meetings
  const memberPersonalMeetings = isMember ? (personalMeetings ?? []) : [];

  const newMeetingLink = (
    <Link
      href={`/${lang}/meet/new`}
      aria-label={t.newMeeting}
      className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      style={{ backgroundColor: brandColor, color: brandText }}
    >
      <Plus className="w-4 h-4" aria-hidden />
      <span className="hidden sm:inline">{t.newMeeting}</span>
    </Link>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-28 sm:pt-32 pb-16">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex items-center gap-3 sm:gap-4 mb-6">
        {hasWorkspace ? (
          <div
            aria-hidden
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
            style={{ backgroundColor: brandColor, color: brandText }}
          >
            {workspace.name[0].toUpperCase()}
          </div>
        ) : user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt=""
            className="w-11 h-11 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            aria-hidden
            className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg shrink-0"
          >
            {(user?.firstName ??
              user?.emailAddresses?.[0]?.emailAddress ??
              "U")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {hasWorkspace
              ? workspace.name
              : (user?.fullName ?? user?.firstName ?? t.fallbackTitle)}
          </h1>
          <p className="text-xs text-gray-500 truncate">
            {user?.emailAddresses?.[0]?.emailAddress}
          </p>
        </div>
        {newMeetingLink}
      </div>

      {/* Soft workspace creation banner (no workspace only) */}
      {!hasWorkspace && !showOnboarding && (
        <div className="bg-white/70 border border-gray-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-dark" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {t.workspaceBanner.title}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {t.workspaceBanner.text}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-dark hover:bg-dark/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t.workspaceBanner.button}
          </button>
        </div>
      )}

      {/* Inline onboarding form */}
      {!hasWorkspace && showOnboarding && (
        <div className="mb-6">
          <WorkspaceOnboarding
            t={t.onboarding}
            onSubmit={handleCreate}
            isLoading={isCreating}
            error={error}
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="animate-in fade-in-0 slide-in-from-top-1 duration-300 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Tab navigation */}
      <div
        role="tablist"
        aria-label={t.tabs.label}
        className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-1 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex sm:inline-flex gap-1 mb-6"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={currentTab === tab}
            aria-controls={`panel-${tab}`}
            aria-label={t.tabs[tab]}
            onClick={() => selectTab(tab)}
            className={`relative isolate flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              currentTab === tab
                ? ""
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
            }`}
            style={currentTab === tab ? { color: brandText } : undefined}
          >
            {currentTab === tab && (
              <SlidingPill
                layoutId="dashboard-tab"
                className="rounded-2xl shadow-sm"
                style={{ backgroundColor: brandColor }}
              />
            )}
            {TAB_ICONS[tab]}
            <span className="text-[11px] leading-tight sm:text-sm" aria-hidden>
              {t.tabs[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={`panel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
        // Remount per tab so the content fades in on every switch.
        key={currentTab}
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      >
        {currentTab === "meetings" && (
          <MeetingsTab
            t={t.meetings}
            meetings={visibleMeetings as any}
            personalMeetings={memberPersonalMeetings as any}
            lang={lang}
            brandColor={brandColor}
            canManage={canManage}
            members={members as any}
            onCancel={handleCancelMeeting}
            onStatusUpdate={handleUpdateMeetingStatus}
          />
        )}

        {currentTab === "overview" && (
          <CoordinationDashboard
            t={t.overview}
            workspaceName={workspace?.name ?? user?.fullName ?? t.fallbackTitle}
            brandingColor={brandColor}
            meetings={visibleMeetings as any}
          />
        )}

        {currentTab === "team" && hasWorkspace && (
          <TeamSection
            t={t.team}
            roles={t.roles}
            workspace={workspace as any}
            members={(members ?? []) as any}
            currentUserId={userId!}
            brandColor={brandColor}
            lang={lang as "pl" | "en"}
            errors={dict.errors}
            onRemove={handleRemoveMember}
          />
        )}

        {currentTab === "settings" && hasWorkspace && (
          <WorkspaceSettings
            t={t.settings}
            workspace={workspace as any}
            onUpdate={handleUpdate}
            error={error}
          />
        )}

        {currentTab === "availability" && userId && (
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 sm:p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]">
            <AvailabilitySettings
              t={t.availability}
              errors={dict.errors}
              lang={lang}
              userId={userId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
