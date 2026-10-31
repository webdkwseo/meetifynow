"use client";

import {
  forgetMeeting,
  readRecentMeetings,
  type RecentMeeting,
} from "@/lib/recentMeetings";
import { fmt } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function RecentMeetings({
  lang,
  t,
  className = "",
}: {
  lang: string;
  t: any;
  className?: string;
}) {
  const [meetings, setMeetings] = useState<RecentMeeting[]>([]);

  // localStorage is browser-only; reading it during render would break hydration.
  useEffect(() => setMeetings(readRecentMeetings()), []);

  if (meetings.length === 0) return null;

  const remove = (id: string) => {
    forgetMeeting(id);
    setMeetings(readRecentMeetings());
  };

  return (
    <section
      aria-labelledby="recent-meetings-heading"
      className={`w-full max-w-xl mx-auto bg-white/90 border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm text-left ${className}`}
    >
      <h2
        id="recent-meetings-heading"
        className="flex items-center gap-2 text-sm font-semibold text-dark"
      >
        <CalendarDays className="w-4 h-4" aria-hidden />
        {t.title}
      </h2>
      <p className="text-xs text-gray-600 mt-0.5 mb-3">{t.hint}</p>
      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
          {meetings.map((m, i) => (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
              className="flex items-center gap-2 py-0.5"
            >
              <Link
                href={`/${lang}/meet/${m.id}`}
                className="flex-1 min-w-0 flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="truncate text-sm font-medium text-gray-900">
                  {m.name}
                </span>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    m.role === "created"
                      ? "bg-sky-50 text-sky-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {m.role === "created" ? t.created : t.answered}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(m.id)}
                aria-label={fmt(t.remove, { name: m.name })}
                title={fmt(t.remove, { name: m.name })}
                className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-dark hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
