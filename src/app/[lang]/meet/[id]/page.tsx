import AnswerMeeting from "@/components/AnswerMeeting/AnswerMeeting";
import { getDictionary } from "@/lib/dictionary";
import { Locale } from "@root/i18n.config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMeeting } from "./getMeeting";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const [dict, meeting] = await Promise.all([
    getDictionary(lang),
    getMeeting(id),
  ]);
  if (!meeting)
    return {
      title: `${dict.page.answerMeeting.notFoundTitle} - MeetifyNow`,
      robots: "noindex, nofollow",
    };
  return {
    title: meeting.meetName + " - MeetifyNow",
    robots: "noindex, nofollow",
    openGraph: {
      title: meeting.meetName,
      description: dict.page.answerMeeting.ogDescription,
      url: `/${lang}/meet/${id}`,
      type: "website",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const [dict, meeting] = await Promise.all([
    getDictionary(lang),
    getMeeting(id),
  ]);
  // Private meetings come back as null for non-members (the layout already 404s).
  if (!meeting) return notFound();

  return <AnswerMeeting lang={lang} dict={dict} meetingData={meeting} />;
}
