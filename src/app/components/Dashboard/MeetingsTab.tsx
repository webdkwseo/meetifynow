"use client";

import Collapse from "@/components/ui/Collapse";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useCopy } from "@/hooks/useCopy";
import { fmt, plural, textOn } from "@/lib/utils";
import { pendingMembers } from "../../../utils/meeting/participants";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  RotateCcw,
  UserX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";

interface MeetingItem {
  _id: string;
  appointmentId: string;
  meetName: string;
  meetPlace?: string;
  answers?: { id?: string; userId?: string; username: string }[];
  finalDate?: number;
  createdAt?: number;
  status?: string;
}

interface Member {
  userId?: string;
  displayName?: string;
  invitedEmail?: string;
}

type TaggedMeeting = MeetingItem & { _source?: "org" | "personal" };

interface MeetingsTabProps {
  t: any;
  meetings: MeetingItem[];
  personalMeetings?: MeetingItem[];
  lang: string;
  brandColor: string;
  canManage?: boolean;
  members?: Member[];
  onCancel: (id: string) => Promise<void>;
  onStatusUpdate: (
    id: string,
    status: "completed" | "no_show",
  ) => Promise<void>;
}

/** Below this many answers a "best slot" is mostly noise. */
const MIN_ANSWERS_TO_PICK = 2;

const iconButton =
  "p-2.5 rounded-lg border border-gray-200 text-gray-500 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function MeetingsTab({
  t,
  meetings,
  personalMeetings = [],
  lang,
  brandColor,
  canManage = false,
  members = [],
  onCancel,
  onStatusUpdate,
}: MeetingsTabProps) {
  const brandText = textOn(brandColor);
  const confirm = useConfirm();
  const { copy, copied } = useCopy();
  const showSourceBadge = personalMeetings.length > 0;

  const allMeetings: TaggedMeeting[] = [
    ...meetings.map((m) => ({ ...m, _source: "org" as const })),
    ...personalMeetings
      .filter((pm) => !meetings.some((m) => m._id === pm._id))
      .map((m) => ({ ...m, _source: "personal" as const })),
  ];

  const now = Date.now();
  const byDate = (a: MeetingItem, b: MeetingItem) =>
    (a.finalDate ?? 0) - (b.finalDate ?? 0);
  const live = allMeetings.filter((m) => m.status !== "cancelled");

  const active = live
    .filter((m) => !m.finalDate)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const upcoming = live
    .filter((m) => m.finalDate && m.finalDate > now && m.status !== "no_show")
    .sort(byDate);
  // Past confirmed meetings count as completed unless marked as a no-show.
  const past = live
    .filter((m) => m.finalDate && m.finalDate <= now && m.status !== "no_show")
    .sort((a, b) => byDate(b, a));
  const noShow = live.filter((m) => m.status === "no_show").sort(byDate);
  const cancelled = allMeetings.filter((m) => m.status === "cancelled");

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleCancel = async (m: MeetingItem) => {
    const ok = await confirm({
      title: fmt(t.confirmCancel, { name: m.meetName }),
      confirmLabel: t.cancel,
      destructive: true,
    });
    if (!ok) return;
    setCancellingId(m._id);
    try {
      await onCancel(m._id);
    } finally {
      setCancellingId(null);
    }
  };

  const handleStatus = async (id: string, status: "completed" | "no_show") => {
    setUpdatingId(id);
    try {
      await onStatusUpdate(id, status);
    } catch {
      // Error is surfaced by the panel banner.
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(lang, {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const meetUrl = (m: MeetingItem) => `/${lang}/meet/${m.appointmentId}`;

  const copyButton = (m: MeetingItem) => (
    <button
      type="button"
      onClick={() =>
        copy(`${window.location.origin}${meetUrl(m)}`, m.appointmentId)
      }
      className={`${iconButton} relative hover:text-gray-800 hover:border-gray-300`}
      title={t.copyLink}
      aria-label={t.copyLink}
    >
      <Copy className="w-4 h-4" aria-hidden />
      <span aria-live="polite">
        {copied === m.appointmentId && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-white bg-gray-800 px-2 py-0.5 rounded whitespace-nowrap">
            {t.copied}
          </span>
        )}
      </span>
    </button>
  );

  const cancelButton = (m: MeetingItem) =>
    canManage && (
      <button
        type="button"
        onClick={() => handleCancel(m)}
        disabled={cancellingId === m._id}
        title={t.cancel}
        aria-label={`${t.cancel}: ${m.meetName}`}
        className={`${iconButton} hover:text-red-600 hover:border-red-200`}
      >
        {cancellingId === m._id ? (
          <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin inline-block" />
        ) : (
          <XCircle className="w-4 h-4" aria-hidden />
        )}
      </button>
    );

  const sourceBadge = (m: TaggedMeeting) =>
    showSourceBadge && (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
          m._source === "org"
            ? "bg-sky-50 text-sky-800"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {m._source === "org" ? t.org : t.mine}
      </span>
    );

  const statusChip = (count: number) => {
    const [label, cls] =
      count === 0
        ? [t.awaiting, "bg-amber-50 text-amber-800"]
        : count < MIN_ANSWERS_TO_PICK
          ? [t.collecting, "bg-sky-50 text-sky-800"]
          : [t.canPick, "bg-emerald-50 text-emerald-800"];
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Upcoming (confirmed, in the future) ── */}
      {upcoming.length > 0 && (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="upcoming-heading"
        >
          <h3
            id="upcoming-heading"
            className="text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            <CalendarCheck
              className="w-4 h-4"
              style={{ color: brandColor }}
              aria-hidden
            />
            {t.scheduled}
            <span className="text-gray-500 font-normal">
              ({upcoming.length})
            </span>
          </h3>
          <ul className="flex flex-col gap-2">
            {upcoming.map((m) => (
              <li
                key={m._id}
                className="bg-white/90 border border-gray-100/80 rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between gap-3"
              >
                <Link
                  href={meetUrl(m)}
                  className="flex-1 min-w-0 rounded-lg hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-semibold text-gray-900 truncate"
                      title={m.meetName}
                    >
                      {m.meetName}
                    </span>
                    {sourceBadge(m)}
                  </span>
                  <span className="block text-sm text-gray-700 mt-0.5">
                    {formatDate(m.finalDate!)}
                  </span>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {copyButton(m)}
                  {cancelButton(m)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Active (collecting answers) ── */}
      <section
        className="flex flex-col gap-3"
        aria-labelledby="pending-heading"
      >
        <h3
          id="pending-heading"
          className="text-sm font-semibold text-gray-700 flex items-center gap-2"
        >
          <CalendarDays
            className="w-4 h-4"
            style={{ color: brandColor }}
            aria-hidden
          />
          {t.pending}
          {active.length > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: brandColor, color: brandText }}
            >
              {active.length}
            </span>
          )}
        </h3>

        {active.length === 0 ? (
          <div className="bg-white/90 border border-gray-100/80 rounded-2xl p-10 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col items-center gap-4 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300" aria-hidden />
            <p className="text-sm text-gray-600">
              {allMeetings.length > 0 ? t.noActive : t.noMeetings}
            </p>
            <Link
              href={`/${lang}/meet/new`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{ backgroundColor: brandColor, color: brandText }}
            >
              + {allMeetings.length > 0 ? t.createNext : t.createFirst}
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((m, i) => {
              const answers = m.answers ?? [];
              const missing =
                m._source === "org"
                  ? pendingMembers(members, answers).length
                  : 0;
              const canPick = answers.length >= MIN_ANSWERS_TO_PICK;
              return (
                <motion.li
                  key={m._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/90 border border-gray-100/80 rounded-2xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="text-sm font-semibold text-gray-900 truncate"
                          title={m.meetName}
                        >
                          {m.meetName}
                        </p>
                        {sourceBadge(m)}
                      </div>
                      {m.meetPlace && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {m.meetPlace}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {statusChip(answers.length)}
                        {answers.length > 0 && (
                          <span className="text-xs text-gray-600">
                            {plural(t.answers, answers.length, lang)}
                          </span>
                        )}
                        {missing > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800">
                            {fmt(t.missing, { count: missing })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {copyButton(m)}
                      {cancelButton(m)}
                      <Link
                        href={meetUrl(m)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          canManage && canPick
                            ? "hover:opacity-90"
                            : "border border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                        style={
                          canManage && canPick
                            ? { backgroundColor: brandColor, color: brandText }
                            : undefined
                        }
                      >
                        {canManage && canPick ? t.pickDate : t.details}
                        <ExternalLink className="w-3 h-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Past (auto-completed) ── */}
      <Collapsible
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden />}
        label={t.completed}
        count={past.length}
      >
        {past.map((m) => (
          <li
            key={m._id}
            className="bg-white/60 border border-gray-100 rounded-xl px-5 py-3 flex items-center justify-between gap-3"
          >
            <Link
              href={meetUrl(m)}
              className="flex-1 min-w-0 rounded hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="block text-sm font-medium text-gray-800 truncate">
                {m.meetName}
              </span>
              <span className="block text-xs text-gray-600 mt-0.5">
                {formatDate(m.finalDate!)}
              </span>
            </Link>
            {canManage && (
              <button
                type="button"
                disabled={updatingId === m._id}
                onClick={() => handleStatus(m._id, "no_show")}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-orange-800 border border-orange-200 hover:bg-orange-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <UserX className="w-3.5 h-3.5" aria-hidden />
                {t.markNoShow}
              </button>
            )}
          </li>
        ))}
      </Collapsible>

      {/* ── No-show ── */}
      <Collapsible
        icon={<UserX className="w-4 h-4 text-orange-600" aria-hidden />}
        label={t.noShow}
        count={noShow.length}
      >
        {noShow.map((m) => (
          <li
            key={m._id}
            className="bg-white/60 border border-orange-100 rounded-xl px-5 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {m.meetName}
              </p>
              {m.finalDate && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatDate(m.finalDate)}
                </p>
              )}
            </div>
            {canManage && (
              <button
                type="button"
                disabled={updatingId === m._id}
                onClick={() => handleStatus(m._id, "completed")}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                {t.undoNoShow}
              </button>
            )}
          </li>
        ))}
      </Collapsible>

      {/* ── Cancelled ── */}
      <Collapsible
        icon={<XCircle className="w-4 h-4 text-red-600" aria-hidden />}
        label={t.cancelled}
        count={cancelled.length}
      >
        {cancelled.map((m) => (
          <li
            key={m._id}
            className="bg-white/50 border border-gray-100 rounded-xl px-5 py-3"
          >
            <p className="text-sm font-medium text-gray-600 line-through truncate">
              {m.meetName}
            </p>
          </li>
        ))}
      </Collapsible>
    </div>
  );
}

function Collapsible({
  icon,
  label,
  count,
  children,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <section className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {icon}
        {label} ({count})
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <Collapse open={open}>
        <ul className="flex flex-col gap-2 pt-3">{children}</ul>
      </Collapse>
    </section>
  );
}
