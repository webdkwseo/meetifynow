"use node";

import { v } from "convex/values";
import { Resend } from "resend";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { buildIcs } from "../src/utils/meeting/calendar";
import { DEFAULT_DURATION_MINUTES } from "./lib/access";

type Lang = "pl" | "en";

const FROM = "MeetifyNow <noreply@meetifynow.com>";
const DEFAULT_TZ = "Europe/Warsaw";
const FONT = "font-family:'Poppins',Arial,Helvetica,sans-serif;";

const baseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "https://meetifynow.com";

function resendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[emails] RESEND_API_KEY is not set — skipping email delivery.",
    );
    return null;
  }
  return new Resend(apiKey);
}

/** Every user-provided value goes through this before it lands in HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const isHttpUrl = (s: string) => /^https?:\/\//i.test(s);

function formatDate(ts: number, lang: Lang, timeZone: string): string {
  const date = new Intl.DateTimeFormat(lang === "pl" ? "pl-PL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(ts));
  return `${date} (${timeZone.replace(/_/g, " ")})`;
}

// ─── Copy ────────────────────────────────────────────────────────────────────

const COPY = {
  pl: {
    ignore: "Jeśli nie spodziewasz się tej wiadomości, możesz ją zignorować.",
    details: "Zobacz szczegóły",
    inviteSubject: (inviter: string, ws: string) =>
      `${inviter} zaprasza Cię do ${ws} — MeetifyNow`,
    inviteTitle: "Zaproszenie do workspace",
    inviteText: (inviter: string, ws: string) =>
      `<strong>${inviter}</strong> zaprasza Cię do workspace <strong>${ws}</strong>.`,
    role: (r: "admin" | "member") =>
      `Rola: ${r === "admin" ? "Admin" : "Członek"}`,
    inviteCta: "Dołącz do workspace",
    inviteExpiry: "Zaproszenie wygaśnie za 7 dni.",
    reminderSubject: (name: string, step: "24h" | "1h") =>
      `Przypomnienie: ${name} za ${step === "24h" ? "24 godziny" : "1 godzinę"}`,
    reminderTitle: "Przypomnienie o spotkaniu",
    reminderIn: (step: "24h" | "1h") =>
      `za ${step === "24h" ? "24 godziny" : "1 godzinę"}`,
    reschedule: "Chcesz przełożyć termin?",
    cancelSubject: (name: string) => `Spotkanie „${name}” zostało anulowane`,
    cancelTitle: "Spotkanie anulowane",
    cancelText: "To spotkanie zostało anulowane przez organizatora.",
    planned: "Planowane",
    finalSubject: (name: string) => `Termin zatwierdzony: ${name}`,
    finalTitle: "Termin spotkania zatwierdzony",
    finalIcs:
      "W załączniku znajdziesz plik .ics — otwórz go, aby dodać spotkanie do kalendarza.",
    fillSubject: (name: string) => `Uzupełnij swoją dostępność: ${name}`,
    fillTitle: "Uzupełnij swoją dostępność",
    fillSubtitle: "Organizator czeka na Twoją odpowiedź",
    fillText: "Zaznacz terminy, które Ci odpowiadają. To zajmie tylko chwilę.",
    fillCta: "Wypełnij ankietę",
  },
  en: {
    ignore: "If you weren't expecting this message, you can ignore it.",
    details: "View details",
    inviteSubject: (inviter: string, ws: string) =>
      `${inviter} invited you to ${ws} — MeetifyNow`,
    inviteTitle: "Workspace invitation",
    inviteText: (inviter: string, ws: string) =>
      `<strong>${inviter}</strong> invited you to the <strong>${ws}</strong> workspace.`,
    role: (r: "admin" | "member") =>
      `Role: ${r === "admin" ? "Admin" : "Member"}`,
    inviteCta: "Join the workspace",
    inviteExpiry: "This invitation expires in 7 days.",
    reminderSubject: (name: string, step: "24h" | "1h") =>
      `Reminder: ${name} in ${step === "24h" ? "24 hours" : "1 hour"}`,
    reminderTitle: "Meeting reminder",
    reminderIn: (step: "24h" | "1h") =>
      `in ${step === "24h" ? "24 hours" : "1 hour"}`,
    reschedule: "Need to reschedule?",
    cancelSubject: (name: string) => `The meeting "${name}" was cancelled`,
    cancelTitle: "Meeting cancelled",
    cancelText: "The organizer cancelled this meeting.",
    planned: "Planned",
    finalSubject: (name: string) => `Date confirmed: ${name}`,
    finalTitle: "Meeting date confirmed",
    finalIcs: "The attached .ics file adds the meeting to your calendar.",
    fillSubject: (name: string) => `Add your availability: ${name}`,
    fillTitle: "Add your availability",
    fillSubtitle: "The organizer is waiting for your answer",
    fillText: "Pick the times that work for you. It only takes a moment.",
    fillCta: "Fill in the poll",
  },
} as const;

// ─── Layout ──────────────────────────────────────────────────────────────────

const HEADER_COLORS = {
  blue: "#00A6FB 0%,#0096E0 100%",
  green: "#22c55e 0%,#16a34a 100%",
  orange: "#f97316 0%,#ea580c 100%",
  gray: "#94a3b8 0%,#64748b 100%",
} as const;

/** Shared card layout. `body` is trusted HTML built from escaped values only. */
function layout(opts: {
  lang: Lang;
  title: string;
  icon: string;
  color: keyof typeof HEADER_COLORS;
  subtitle?: string;
  body: string;
  cta?: { href: string; label: string };
  footnote?: string;
}): string {
  const t = COPY[opts.lang];
  const cta = opts.cta
    ? `<tr><td align="center" style="padding:8px 0 16px;">
        <a href="${esc(opts.cta.href)}" target="_blank" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,${HEADER_COLORS.blue});color:#ffffff;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;${FONT}">${opts.cta.label} &rarr;</a>
      </td></tr>`
    : "";
  return `<!DOCTYPE html>
<html lang="${opts.lang}" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${opts.title} — MeetifyNow</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f0f4f8;${FONT}">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;padding:48px 16px 40px;">
      <tr><td align="center">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
          <tr><td align="center" style="padding:0 0 28px;">
            <span style="font-size:22px;font-weight:600;letter-spacing:-0.4px;color:#1e293b;${FONT}">meetify<span style="color:#0070A8;">now</span></span>
          </td></tr>
          <tr><td style="background:#ffffff;border-radius:20px;padding:0 0 32px;box-shadow:0 4px 24px -4px rgba(0,0,0,0.08);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:linear-gradient(135deg,${HEADER_COLORS[opts.color]});padding:32px 44px 28px;border-radius:20px 20px 0 0;text-align:center;">
                <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px;"><tr><td align="center" valign="middle" style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:16px;font-size:28px;line-height:60px;color:#ffffff;">${opts.icon}</td></tr></table>
                <h1 style="margin:0;font-size:21px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;${FONT}">${opts.title}</h1>
                ${opts.subtitle ? `<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);${FONT}">${opts.subtitle}</p>` : ""}
              </td></tr>
              <tr><td style="padding:32px 44px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${opts.body}
                  ${cta}
                  <tr><td style="padding:16px 0 20px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" /></td></tr>
                  <tr><td align="center">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;${FONT}">${opts.footnote ?? t.ignore}</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:28px 0 0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;${FONT}">&copy; ${new Date().getFullYear()} MeetifyNow &middot; meetifynow.com</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const row = (html: string, pad = 20) =>
  `<tr><td align="center" style="padding:0 0 ${pad}px;">${html}</td></tr>`;
const nameRow = (name: string) =>
  row(
    `<p style="margin:0;font-size:18px;font-weight:600;color:#1e293b;${FONT}">${esc(name)}</p>`,
  );
const textRow = (html: string) =>
  row(
    `<p style="margin:0;font-size:14px;line-height:1.7;color:#475569;${FONT}">${html}</p>`,
    24,
  );
const dateRow = (date: string, bg: string, color: string) =>
  row(
    `<span style="display:inline-block;padding:8px 20px;background:${bg};border-radius:999px;font-size:14px;font-weight:500;color:${color};${FONT}">&#128197; ${esc(date)}</span>`,
  );

function locationRow(meeting: Doc<"meetings">): string {
  const link =
    meeting.meetLink && isHttpUrl(meeting.meetLink) ? meeting.meetLink : null;
  const html = link
    ? `<a href="${esc(link)}" style="color:#0070A8;text-decoration:none;">${esc(link)}</a>`
    : meeting.meetPlace
      ? `<span style="color:#1e293b;">${esc(meeting.meetPlace)}</span>`
      : "";
  return html
    ? row(
        `<p style="margin:0;font-size:13px;color:#475569;${FONT}">&#128205; ${html}</p>`,
        24,
      )
    : "";
}

function meetingContext(meeting: Doc<"meetings">) {
  const lang: Lang = meeting.lang ?? "pl";
  const tz = meeting.timezone ?? DEFAULT_TZ;
  const url = `${baseUrl()}/${lang}/meet/${meeting.appointmentId}`;
  return { lang, tz, url, t: COPY[lang] };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export const sendInvitationEmail = internalAction({
  args: {
    toEmail: v.string(),
    inviterName: v.string(),
    workspaceName: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    token: v.string(),
    lang: v.union(v.literal("pl"), v.literal("en")),
  },
  handler: async (_ctx, args) => {
    const resend = resendClient();
    if (!resend) return { sent: false };
    const t = COPY[args.lang];
    const inviter = esc(args.inviterName);
    const ws = esc(args.workspaceName);

    const { error } = await resend.emails.send({
      from: FROM,
      to: args.toEmail,
      subject: t.inviteSubject(args.inviterName, args.workspaceName),
      html: layout({
        lang: args.lang,
        title: t.inviteTitle,
        icon: "&#9993;",
        color: "blue",
        body:
          textRow(t.inviteText(inviter, ws)) +
          row(
            `<span style="display:inline-block;padding:6px 16px;background:#e0f2fe;border-radius:999px;font-size:13px;font-weight:500;color:#075985;${FONT}">${t.role(args.role)}</span>`,
          ),
        cta: {
          href: `${baseUrl()}/${args.lang}/join/${args.token}`,
          label: t.inviteCta,
        },
        footnote: `${t.inviteExpiry} ${t.ignore}`,
      }),
    });

    if (error) throw new Error(`Resend error: ${error.message ?? "unknown"}`);
    return { sent: true };
  },
});

export const dispatchReminder = internalAction({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.reminders.getWithMeeting, {
      reminderId: args.reminderId,
    });
    if (!data) return;
    const { reminder, meeting } = data;

    // Idempotency: only process "scheduled" reminders
    if (reminder.status !== "scheduled") return;

    if (
      meeting.status === "cancelled" ||
      !meeting.finalDate ||
      !meeting.organizerEmail
    ) {
      await ctx.runMutation(internal.reminders.markCancelled, {
        reminderId: args.reminderId,
      });
      return;
    }

    const resend = resendClient();
    if (!resend) return;
    const { lang, tz, url, t } = meetingContext(meeting);

    const { error } = await resend.emails.send({
      from: FROM,
      to: meeting.organizerEmail,
      subject: t.reminderSubject(meeting.meetName, reminder.step),
      html: layout({
        lang,
        title: t.reminderTitle,
        subtitle: t.reminderIn(reminder.step),
        icon: "&#9200;",
        color: "blue",
        body:
          nameRow(meeting.meetName) +
          dateRow(
            formatDate(meeting.finalDate, lang, tz),
            "#e0f2fe",
            "#075985",
          ) +
          locationRow(meeting),
        cta: { href: url, label: t.details },
        footnote: `<a href="${esc(`${url}/reschedule`)}" style="color:#475569;text-decoration:underline;">${t.reschedule}</a>`,
      }),
    });

    if (error) throw new Error(`Resend error: ${error.message ?? "unknown"}`);

    await ctx.runMutation(internal.reminders.markSent, {
      reminderId: args.reminderId,
    });
  },
});

export const sendCancellationEmail = internalAction({
  args: { toEmail: v.string(), appointmentId: v.string() },
  handler: async (ctx, args) => {
    const meeting = await ctx.runQuery(
      internal.meetings.internalGetByAppointmentId,
      { appointmentId: args.appointmentId },
    );
    const resend = resendClient();
    if (!meeting || !resend) return;
    const { lang, tz, t } = meetingContext(meeting);

    const { error } = await resend.emails.send({
      from: FROM,
      to: args.toEmail,
      subject: t.cancelSubject(meeting.meetName),
      html: layout({
        lang,
        title: t.cancelTitle,
        icon: "&#10005;",
        color: "gray",
        body:
          nameRow(meeting.meetName) +
          (meeting.finalDate
            ? dateRow(
                `${t.planned}: ${formatDate(meeting.finalDate, lang, tz)}`,
                "#f1f5f9",
                "#475569",
              )
            : "") +
          textRow(t.cancelText),
      }),
    });
    if (error)
      console.error(`[emails] Cancellation email error: ${error.message}`);
  },
});

export const sendMeetingFinalizedEmails = internalAction({
  args: {
    appointmentId: v.string(),
    finalDate: v.number(),
    recipientEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.runQuery(
      internal.meetings.internalGetByAppointmentId,
      { appointmentId: args.appointmentId },
    );
    const resend = resendClient();
    if (!meeting || !resend) return;
    const { lang, tz, url, t } = meetingContext(meeting);

    const html = layout({
      lang,
      title: t.finalTitle,
      icon: "&#10003;",
      color: "green",
      body:
        nameRow(meeting.meetName) +
        dateRow(formatDate(args.finalDate, lang, tz), "#dcfce7", "#166534") +
        locationRow(meeting) +
        textRow(t.finalIcs),
      cta: { href: url, label: t.details },
    });
    const ics = Buffer.from(
      buildIcs({
        uid: meeting.appointmentId,
        title: meeting.meetName,
        start: args.finalDate,
        durationMinutes: meeting.durationMinutes ?? DEFAULT_DURATION_MINUTES,
        location: meeting.meetLink ?? meeting.meetPlace,
        url,
      }),
    ).toString("base64");

    for (const toEmail of args.recipientEmails) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: t.finalSubject(meeting.meetName),
        html,
        attachments: [
          {
            filename: "meeting.ics",
            content: ics,
            contentType: "text/calendar",
          },
        ],
      });
      if (error)
        console.error(
          `[emails] Finalization email error for ${toEmail}: ${error.message}`,
        );
    }
  },
});

export const sendFillReminder = internalAction({
  args: {
    appointmentId: v.string(),
    recipientEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.runQuery(
      internal.meetings.internalGetByAppointmentId,
      { appointmentId: args.appointmentId },
    );
    const resend = resendClient();
    if (!meeting || !resend) return;
    const { lang, url, t } = meetingContext(meeting);

    const html = layout({
      lang,
      title: t.fillTitle,
      subtitle: t.fillSubtitle,
      icon: "&#128203;",
      color: "orange",
      body: nameRow(meeting.meetName) + textRow(t.fillText),
      cta: { href: url, label: t.fillCta },
    });

    for (const toEmail of args.recipientEmails) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: t.fillSubject(meeting.meetName),
        html,
      });
      if (error)
        console.error(
          `[emails] Fill reminder error for ${toEmail}: ${error.message}`,
        );
    }
  },
});
