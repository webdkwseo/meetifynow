"use client";

import { motion } from "framer-motion";
import { DEFAULT_BRAND_COLOR, fmt } from "@/lib/utils";
import { Calendar, CheckCircle2, Clock, TrendingUp, Users } from "lucide-react";

interface Meeting {
  _id: string;
  meetName: string;
  createdAt?: number;
  closedAt?: number;
  finalDate?: number;
  status?: string;
  answers?: { respondedAt?: number }[];
}

interface CoordinationDashboardProps {
  t: any;
  workspaceName: string;
  brandingColor?: string;
  meetings: Meeting[];
}

/** Formats a duration as hours under a day, otherwise days. */
function formatDuration(avgMs: number, t: any): string {
  const hours = Math.round(avgMs / 1000 / 60 / 60);
  if (hours < 1) return t.underHour;
  if (hours < 24) return fmt(t.hours, { count: hours });
  return fmt(t.days, { count: Math.round(hours / 24) });
}

function avgTimeToClose(meetings: Meeting[], t: any): string {
  const closed = meetings.filter((m) => m.createdAt && m.closedAt);
  if (closed.length === 0) return "—";
  const avgMs =
    closed.reduce((sum, m) => sum + (m.closedAt! - m.createdAt!), 0) /
    closed.length;
  return formatDuration(avgMs, t);
}

function avgResponses(meetings: Meeting[]): string {
  const withAnswers = meetings.filter((m) => m.answers && m.answers.length > 0);
  if (withAnswers.length === 0) return "—";
  const avg =
    withAnswers.reduce((sum, m) => sum + m.answers!.length, 0) /
    withAnswers.length;
  return avg.toFixed(1);
}

function avgResponseLatency(meetings: Meeting[], t: any): string {
  const allLatencies: number[] = meetings.flatMap((m) => {
    if (!m.createdAt || !m.answers) return [];
    return m.answers
      .filter((a) => a.respondedAt)
      .map((a) => a.respondedAt! - m.createdAt!);
  });
  if (allLatencies.length === 0) return "—";
  const avgMs = allLatencies.reduce((s, v) => s + v, 0) / allLatencies.length;
  return formatDuration(avgMs, t);
}

export default function CoordinationDashboard({
  t,
  workspaceName,
  brandingColor = DEFAULT_BRAND_COLOR,
  meetings: allMeetings,
}: CoordinationDashboardProps) {
  // Cancelled meetings would skew both the close rate and the averages.
  const meetings = allMeetings.filter((m) => m.status !== "cancelled");
  const total = meetings.length;
  const closed = meetings.filter((m) => m.finalDate).length;
  const closedPct = total > 0 ? Math.round((closed / total) * 100) : 0;
  const avg = avgTimeToClose(meetings, t);
  const responses = avgResponses(meetings);
  const latency = avgResponseLatency(meetings, t);

  const stats = [
    {
      icon: Calendar,
      label: t.total,
      value: total,
      sub: t.totalSub,
    },
    {
      icon: CheckCircle2,
      label: t.closed,
      value: `${closed} (${closedPct}%)`,
      sub: t.closedSub,
    },
    {
      icon: Clock,
      label: t.avgClose,
      value: avg,
      sub: t.avgCloseSub,
    },
    {
      icon: Users,
      label: t.avgResponses,
      value: responses,
      sub: t.avgResponsesSub,
    },
    {
      icon: TrendingUp,
      label: t.avgLatency,
      value: latency,
      sub: t.avgLatencySub,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center gap-2">
        <TrendingUp
          className="w-4 h-4"
          style={{ color: brandingColor }}
          aria-hidden
        />
        <h2 className="text-sm font-semibold text-gray-700">
          {fmt(t.title, { name: workspaceName })}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map(({ icon: Icon, label, value, sub }, i) => (
          <div
            key={label}
            className={`${i === 0 ? "col-span-2 sm:col-span-1" : ""} bg-white/90 border border-gray-200/60 rounded-2xl p-5 flex flex-col gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon
                className="w-4 h-4"
                style={{ color: brandingColor }}
                aria-hidden
              />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{sub}</p>
          </div>
        ))}
      </div>

      {total === 0 && (
        <p className="text-sm text-center text-gray-500 py-6">{t.empty}</p>
      )}
    </motion.div>
  );
}
