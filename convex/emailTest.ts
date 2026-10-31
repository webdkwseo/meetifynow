"use node";

/**
 * PLIK TYMCZASOWY — tylko do testów emaili. Internal: uruchamiaj z dashboardu Convex
 * lub `npx convex run emailTest:sendTestReminder`.
 */

import { v } from "convex/values";
import { Resend } from "resend";
import { internalAction } from "./_generated/server";

const FROM = "MeetifyNow <noreply@meetifynow.com>";

export const sendTestReminder = internalAction({
  args: { toEmail: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(apiKey);

    const finalDate = Date.now() + 24 * 60 * 60 * 1000; // jutro
    const dateStr = new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    }).format(new Date(finalDate));

    const { error } = await resend.emails.send({
      from: FROM,
      to: args.toEmail,
      subject: "TEST — Przypomnienie: Demo Meeting za 24 godziny",
      html: `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Przypomnienie TEST</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Poppins',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8;padding:48px 16px 40px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
  <tr><td align="center" style="padding:0 0 28px;">
    <span style="font-size:22px;font-weight:600;color:#1e293b;">meetify<span style="color:#00A6FB;">now</span></span>
  </td></tr>
  <tr><td style="background:#fff;border-radius:20px;padding:0 0 36px;box-shadow:0 4px 24px -4px rgba(0,0,0,.08);overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:linear-gradient(135deg,#00A6FB,#0096E0);padding:32px 44px 28px;border-radius:20px 20px 0 0;text-align:center;">
        <div style="width:60px;height:60px;background:rgba(255,255,255,.2);border-radius:16px;font-size:28px;line-height:60px;margin:0 auto 16px;">&#128337;</div>
        <h1 style="margin:0;font-size:21px;font-weight:600;color:#fff;">Przypomnienie o spotkaniu</h1>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.85);">za 24 godziny</p>
      </td></tr>
      <tr><td style="padding:36px 44px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:0 0 20px;">
            <p style="margin:0;font-size:18px;font-weight:600;color:#1e293b;">Demo Meeting (TEST)</p>
          </td></tr>
          <tr><td align="center" style="padding:0 0 20px;">
            <span style="display:inline-block;padding:8px 20px;background:#e0f4fe;border-radius:999px;font-size:14px;font-weight:500;color:#0096E0;">&#128197; ${dateStr}</span>
          </td></tr>
          <tr><td align="center" style="padding:0 0 16px;">
            <a href="https://meetifynow.com" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#00A6FB,#0096E0);color:#fff;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;">Zobacz szczegóły &rarr;</a>
          </td></tr>
          <tr><td align="center" style="padding:0 0 36px;">
            <a href="https://meetifynow.com" style="font-size:13px;color:#94a3b8;text-decoration:underline;">Chcesz przełożyć termin?</a>
          </td></tr>
          <tr><td style="padding:0 0 20px;"><hr style="border:none;border-top:1px solid #f1f5f9;"/></td></tr>
          <tr><td align="center"><p style="margin:0;font-size:12px;color:#94a3b8;">To jest wiadomość testowa z MeetifyNow.</p></td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:28px 0 0;">
    <p style="margin:0;font-size:11px;color:#cbd5e1;">&copy; 2026 MeetifyNow &middot; meetifynow.com</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    });

    if (error) throw new Error(`Resend error: ${(error as any).message}`);
    return { sent: true, to: args.toEmail };
  },
});

export const sendTestCancellation = internalAction({
  args: { toEmail: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(apiKey);

    const finalDate = Date.now() + 3 * 24 * 60 * 60 * 1000; // za 3 dni
    const dateStr = new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    }).format(new Date(finalDate));

    const { error } = await resend.emails.send({
      from: FROM,
      to: args.toEmail,
      subject: 'TEST — Spotkanie "Demo Meeting" zostało anulowane',
      html: `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Anulowanie TEST</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Poppins',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8;padding:48px 16px 40px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
  <tr><td align="center" style="padding:0 0 28px;">
    <span style="font-size:22px;font-weight:600;color:#1e293b;">meetify<span style="color:#00A6FB;">now</span></span>
  </td></tr>
  <tr><td style="background:#fff;border-radius:20px;padding:0 0 36px;box-shadow:0 4px 24px -4px rgba(0,0,0,.08);overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:linear-gradient(135deg,#94a3b8,#64748b);padding:32px 44px 28px;border-radius:20px 20px 0 0;text-align:center;">
        <div style="width:60px;height:60px;background:rgba(255,255,255,.2);border-radius:16px;font-size:28px;line-height:60px;margin:0 auto 16px;">&#10060;</div>
        <h1 style="margin:0;font-size:21px;font-weight:600;color:#fff;">Spotkanie anulowane</h1>
      </td></tr>
      <tr><td style="padding:36px 44px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:0 0 16px;">
            <p style="margin:0;font-size:18px;font-weight:600;color:#1e293b;">Demo Meeting (TEST)</p>
          </td></tr>
          <tr><td align="center" style="padding:0 0 24px;">
            <span style="display:inline-block;padding:8px 20px;background:#f1f5f9;border-radius:999px;font-size:13px;color:#64748b;">Planowane: ${dateStr}</span>
          </td></tr>
          <tr><td align="center">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">To spotkanie zostało anulowane przez organizatora.</p>
          </td></tr>
          <tr><td style="padding:24px 0 0;"><hr style="border:none;border-top:1px solid #f1f5f9;"/></td></tr>
          <tr><td align="center" style="padding:16px 0 0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">To jest wiadomość testowa z MeetifyNow.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:28px 0 0;">
    <p style="margin:0;font-size:11px;color:#cbd5e1;">&copy; 2026 MeetifyNow &middot; meetifynow.com</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    });

    if (error) throw new Error(`Resend error: ${(error as any).message}`);
    return { sent: true, to: args.toEmail };
  },
});
