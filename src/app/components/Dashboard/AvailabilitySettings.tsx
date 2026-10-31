"use client";

import { errorText, fmt } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Check, Info, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayRule = {
  dayOfWeek: number;
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

// Stored with Sunday = 0; displayed Monday-first like the rest of the app.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_SCHEDULE: DayRule[] = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
  dayOfWeek: dow,
  enabled: dow >= 1 && dow <= 5,
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
}));

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

const inputClass =
  "rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

// ─── HourSelect ───────────────────────────────────────────────────────────────

function HourSelect({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  invalid?: boolean;
}) {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      options.push(formatTime(h, m));
    }
  }
  return (
    <select
      value={value}
      aria-label={label}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} px-2 py-1 ${invalid ? "!border-red-400" : ""}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** YYYY-MM-DD in the browser's zone (toISOString would use UTC). */
const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── ExceptionsPanel ─────────────────────────────────────────────────────────

function ExceptionsPanel({
  userId,
  t,
  errors,
  lang,
}: {
  userId: string;
  t: any;
  errors: Record<string, string>;
  lang: string;
}) {
  const exceptions = useQuery(api.availability.getExceptions, { userId });
  const addException = useMutation(api.availability.addException);
  const removeException = useMutation(api.availability.removeException);

  const [newDate, setNewDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  async function handleAdd() {
    if (!newDate) return;
    setAdding(true);
    setErr("");
    try {
      await addException({ dateStr: newDate, type: "blocked" });
      setNewDate("");
    } catch (e) {
      setErr(errorText(e, errors, t.error));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        {t.exceptions}
      </h3>
      <p className="mb-3 text-xs text-gray-600">{t.exceptionsHint}</p>

      <div className="flex items-center gap-2 mb-3">
        <label htmlFor="exception-date" className="sr-only">
          {t.exceptionDate}
        </label>
        <input
          id="exception-date"
          type="date"
          value={newDate}
          min={localDateStr(new Date())}
          onChange={(e) => setNewDate(e.target.value)}
          className={`${inputClass} px-3 py-1.5`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newDate}
          className="flex items-center gap-1 rounded-md bg-dark px-3 py-1.5 text-sm text-white hover:bg-dark/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {t.add}
        </button>
      </div>

      {err && (
        <p role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-xs text-red-600 mb-2">
          {err}
        </p>
      )}

      {exceptions && exceptions.length > 0 ? (
        <ul className="space-y-1.5">
          {exceptions.map((ex) => (
            <li
              key={ex._id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-700">
                {new Date(`${ex.dateStr}T00:00:00`).toLocaleDateString(lang, {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="text-xs text-gray-500 mr-auto ml-3">
                {ex.type === "blocked" ? t.blocked : t.customHours}
              </span>
              <button
                type="button"
                onClick={() =>
                  removeException({ exceptionId: ex._id }).catch((e) =>
                    setErr(errorText(e, errors, t.error)),
                  )
                }
                className="p-1 rounded text-gray-500 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t.removeException}
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">{t.noExceptions}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AvailabilitySettings({
  userId,
  t,
  errors,
  lang,
}: {
  userId: string;
  t: any;
  errors: Record<string, string>;
  lang: string;
}) {
  const rulesDoc = useQuery(api.availability.getAvailabilityRules, { userId });
  const upsertRules = useMutation(api.availability.upsertAvailabilityRules);

  const [schedule, setSchedule] = useState<DayRule[]>(DEFAULT_SCHEDULE);
  const [bufferBefore, setBufferBefore] = useState(15);
  const [bufferAfter, setBufferAfter] = useState(15);
  const [minNotice, setMinNotice] = useState(60);
  const [maxHorizon, setMaxHorizon] = useState(90);
  const [timezone, setTimezone] = useState("Europe/Warsaw");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Populate form from existing rules doc
  useEffect(() => {
    if (rulesDoc) {
      setSchedule(rulesDoc.weeklySchedule as DayRule[]);
      setBufferBefore(rulesDoc.bufferBefore);
      setBufferAfter(rulesDoc.bufferAfter);
      setMinNotice(rulesDoc.minNotice);
      setMaxHorizon(rulesDoc.maxHorizon);
      setTimezone(rulesDoc.timezone);
    }
  }, [rulesDoc]);

  const isInvalid = (d: DayRule) =>
    d.enabled &&
    d.endHour * 60 + d.endMinute <= d.startHour * 60 + d.startMinute;
  const invalidDays = schedule.filter(isInvalid);

  function toggleDay(dow: number) {
    setSchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dow ? { ...d, enabled: !d.enabled } : d,
      ),
    );
  }

  function updateDayTime(dow: number, field: "start" | "end", value: string) {
    const { hour, minute } = parseTime(value);
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dow) return d;
        if (field === "start")
          return { ...d, startHour: hour, startMinute: minute };
        return { ...d, endHour: hour, endMinute: minute };
      }),
    );
  }

  async function handleSave() {
    if (invalidDays.length > 0) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await upsertRules({
        timezone,
        weeklySchedule: schedule,
        bufferBefore,
        bufferAfter,
        minNotice,
        maxHorizon,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(errorText(e, errors, t.saveFailed));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{t.title}</h2>
        <p className="mt-1 text-sm text-gray-600">{t.description}</p>
      </div>

      {/* Timezone */}
      <div>
        <label
          htmlFor="availability-timezone"
          className="block mb-1 text-sm font-medium text-gray-700"
        >
          {t.timezone}
        </label>
        <select
          id="availability-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={`${inputClass} w-full max-w-xs px-3 py-2`}
        >
          <option value="Europe/Warsaw">Europe/Warsaw (UTC+1/+2)</option>
          <option value="Europe/London">Europe/London (UTC/+1)</option>
          <option value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</option>
          <option value="America/New_York">America/New_York (UTC-5/-4)</option>
          <option value="America/Los_Angeles">
            America/Los_Angeles (UTC-8/-7)
          </option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      {/* Weekly schedule */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t.weekly}</h3>
        <div className="space-y-2">
          {DISPLAY_ORDER.map((dow) => {
            const day = schedule.find((d) => d.dayOfWeek === dow);
            if (!day) return null;
            const dayName = t.days[dow];
            const invalid = isInvalid(day);
            return (
              <div
                key={dow}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 sm:px-4 py-3 transition-colors ${
                  invalid
                    ? "border-red-300 bg-red-50"
                    : day.enabled
                      ? "border-primary/30 bg-primary/5"
                      : "border-gray-200 bg-white"
                }`}
              >
                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={day.enabled}
                  aria-label={fmt(t.toggleDay, { day: dayName })}
                  onClick={() => toggleDay(dow)}
                  className={`flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    day.enabled ? "bg-dark" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-200 ${
                      day.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Day label */}
                <span
                  className={`w-28 text-sm font-medium ${
                    day.enabled ? "text-gray-800" : "text-gray-500"
                  }`}
                >
                  {dayName}
                </span>

                {day.enabled ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <HourSelect
                      label={fmt(t.from, { day: dayName })}
                      value={formatTime(day.startHour, day.startMinute)}
                      onChange={(v) => updateDayTime(dow, "start", v)}
                      invalid={invalid}
                    />
                    <span className="text-gray-500 text-sm" aria-hidden>
                      –
                    </span>
                    <HourSelect
                      label={fmt(t.to, { day: dayName })}
                      value={formatTime(day.endHour, day.endMinute)}
                      onChange={(v) => updateDayTime(dow, "end", v)}
                      invalid={invalid}
                    />
                  </div>
                ) : (
                  <span className="ml-auto text-xs text-gray-500">
                    {t.unavailable}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {invalidDays.length > 0 && (
          <ul role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 mt-2 text-xs text-red-600 space-y-0.5">
            {invalidDays.map((d) => (
              <li key={d.dayOfWeek}>
                {fmt(t.invalidRange, { day: t.days[d.dayOfWeek] })}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Buffers & horizons */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t.limits}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            id="buffer-before"
            label={t.bufferBefore}
            unit={t.minutes}
            value={bufferBefore}
            onChange={setBufferBefore}
            min={0}
            max={120}
          />
          <NumberField
            id="buffer-after"
            label={t.bufferAfter}
            unit={t.minutes}
            value={bufferAfter}
            onChange={setBufferAfter}
            min={0}
            max={120}
          />
          <NumberField
            id="min-notice"
            label={t.minNotice}
            unit={t.minutes}
            value={minNotice}
            onChange={setMinNotice}
            min={0}
            max={10080}
          />
          <NumberField
            id="max-horizon"
            label={t.maxHorizon}
            unit={t.daysUnit}
            value={maxHorizon}
            onChange={setMaxHorizon}
            min={1}
            max={365}
          />
        </div>
        <p className="mt-2 flex items-start gap-1 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          {t.limitsInfo}
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || invalidDays.length > 0}
          className="flex items-center gap-2 rounded-xl bg-dark px-5 py-2.5 text-sm font-medium text-white hover:bg-dark/90 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {saved ? <Check className="w-4 h-4" aria-hidden /> : null}
          {saving ? t.saving : saved ? t.saved : t.save}
        </button>
        {error && (
          <p role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* Exceptions */}
      <ExceptionsPanel userId={userId} t={t} errors={errors} lang={lang} />
    </div>
  );
}

// ─── NumberField ──────────────────────────────────────────────────────────────

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-1 text-xs font-medium text-gray-600"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n >= min && n <= max) onChange(n);
          }}
          className={`${inputClass} w-24 px-3 py-1.5`}
        />
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  );
}
