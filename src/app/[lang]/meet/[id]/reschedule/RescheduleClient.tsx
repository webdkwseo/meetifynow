"use client";

import { useMutation } from "convex/react";
import { errorText } from "@/lib/utils";
import { useState } from "react";
import { api } from "../../../../../../convex/_generated/api";

interface Props {
  appointmentId: string;
  dates: number[];
  currentFinalDate: number | null;
  lang: string;
  /** Meeting's zone: identical on server and client, so no hydration mismatch. */
  timeZone: string;
  t: any;
  errors: Record<string, string>;
}

const formatSlot = (lang: string, ts: number, timeZone: string) =>
  new Intl.DateTimeFormat(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(ts));

export default function RescheduleClient({
  appointmentId,
  dates,
  currentFinalDate,
  lang,
  timeZone,
  t,
  errors,
}: Props) {
  const reschedule = useMutation(api.meetings.reschedule);
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!selected) return;
    setState("loading");
    try {
      await reschedule({ appointmentId, newFinalDate: selected });
      setState("success");
    } catch (e) {
      setErrorMsg(errorText(e, errors, t.failed));
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div role="status" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-center">
        <div className="text-5xl mb-4" aria-hidden>
          ✅
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {t.success}
        </h2>
        <p className="text-gray-600 text-sm">
          {formatSlot(lang, selected!, timeZone)}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p
        id="reschedule-pick"
        className="text-sm text-gray-600 mb-4 text-center"
      >
        {t.pick}
      </p>

      <ul
        role="radiogroup"
        aria-labelledby="reschedule-pick"
        className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto"
      >
        {dates.map((d) => {
          const isActive = d === selected;
          const isCurrent = d === currentFinalDate;
          const label = formatSlot(lang, d, timeZone);

          return (
            <li key={d}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSelected(d)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "border-dark bg-primary/10 text-dark font-medium"
                    : "border-gray-200 bg-white text-gray-900 hover:border-dark"
                }`}
              >
                <span>{label}</span>
                {isCurrent && (
                  <span className="ml-2 text-xs text-gray-500">
                    {t.current}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {state === "error" && (
        <p role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-red-600 text-sm text-center mb-4">
          {errorMsg}
        </p>
      )}

      <button
        type="button"
        disabled={!selected || state === "loading"}
        onClick={handleSubmit}
        className="w-full py-3 rounded-xl bg-dark hover:bg-dark/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {state === "loading" ? t.saving : t.confirm}
      </button>
    </div>
  );
}
