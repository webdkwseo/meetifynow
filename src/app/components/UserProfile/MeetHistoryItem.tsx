"use client";

import Subheading from "@/components/Subheading.tsx";
import { useMutation } from "convex/react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";

export default function MeetHistoryItem({
  meetId,
  meetName,
  meetPlace,
  lang,
}: {
  meetId: string;
  meetName: string;
  meetPlace: string;
  lang: string;
}) {
  const cloneAsRecurring = useMutation(api.meetings.cloneAsRecurring);
  // Not wired into any page yet, so it has no dictionary slice of its own.
  const cloneLabel = lang === "pl" ? "Powtórz spotkanie" : "Repeat meeting";
  const [cloning, setCloning] = useState(false);

  const handleClone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cloning) return;
    setCloning(true);
    try {
      const newId = await cloneAsRecurring({ appointmentId: meetId });
      window.location.href = `/${lang}/meet/${newId}`;
    } catch {
      setCloning(false);
    }
  };

  return (
    <li key={meetId} className="flex items-center gap-2">
      <Link
        href={`/${lang}/meet/${meetId}`}
        className="flex flex-col flex-1 mb-2 rounded-lg p-4 bg-light-hover hover:bg-light-primary active:bg-light-active transition-colors"
      >
        <Subheading text={meetName} />
        {meetPlace && (
          <p>
            <span>🏢 {meetPlace}</span>
          </p>
        )}
      </Link>
      <button
        type="button"
        onClick={handleClone}
        disabled={cloning}
        title={cloneLabel}
        aria-label={`${cloneLabel}: ${meetName}`}
        className="mb-2 p-2.5 rounded-lg border border-gray-200 hover:border-dark hover:text-dark text-gray-600 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <RefreshCw
          size={16}
          className={cloning ? "animate-spin" : ""}
          aria-hidden
        />
      </button>
    </li>
  );
}
