import { getDictionary } from "@/lib/dictionary";
import { Locale } from "@root/i18n.config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMeeting } from "../getMeeting";
import RescheduleClient from "./RescheduleClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: dict.page.reschedule.metaTitle, robots: "noindex, nofollow" };
}

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const [dict, meeting] = await Promise.all([
    getDictionary(lang),
    getMeeting(id),
  ]);
  const t = dict.page.reschedule;

  if (!meeting) notFound();

  if (meeting.status === "cancelled") {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-6 pt-28">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4" aria-hidden>
            ❌
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {t.cancelledTitle}
          </h1>
          <p className="text-gray-600 text-sm">{t.cancelledText}</p>
        </div>
      </main>
    );
  }

  // Offer the actual half-hour slots of the poll, not just the days.
  const slots = (meeting.dates ?? [])
    .flatMap((d: any) => (d.times ?? []) as number[])
    .sort((a: number, b: number) => a - b);

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-6 pt-28">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">
          {t.title}
        </h1>
        <p className="text-gray-700 text-center text-sm mb-1">
          {meeting.meetName}
        </p>
        <p className="text-gray-600 text-center text-xs mb-6">
          {(meeting.timezone ?? "Europe/Warsaw").replace(/_/g, " ")}
        </p>

        {slots.length === 0 ? (
          <p className="text-center text-gray-500 text-sm">{t.noDates}</p>
        ) : (
          <RescheduleClient
            appointmentId={id}
            dates={slots}
            currentFinalDate={meeting.finalDate ?? null}
            lang={lang}
            timeZone={meeting.timezone ?? "Europe/Warsaw"}
            t={t}
            errors={dict.errors}
          />
        )}
      </div>
    </main>
  );
}
