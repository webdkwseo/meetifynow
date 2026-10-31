/** Calendar exports shared by the meeting page and Convex e-mails. */

export type CalendarEvent = {
  uid: string;
  title: string;
  start: number;
  durationMinutes: number;
  location?: string;
  url: string;
};

/** 20261031T090000Z */
const utcStamp = (ts: number) =>
  new Date(ts)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const icsText = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

export function buildIcs(e: CalendarEvent, now = Date.now()): string {
  const end = e.start + e.durationMinutes * 60_000;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MeetifyNow//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@meetifynow.com`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(e.start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    e.location ? `LOCATION:${icsText(e.location)}` : "",
    `URL:${e.url}`,
    `DESCRIPTION:${icsText(e.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const end = e.start + e.durationMinutes * 60_000;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcStamp(e.start)}/${utcStamp(end)}`,
    details: e.url,
  });
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
