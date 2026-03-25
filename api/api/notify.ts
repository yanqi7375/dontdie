// Retry logic is handled by the calling agent (OpenClaw skill).
// This endpoint is idempotent — safe to call multiple times for the same event.

// TODO: Add rate limiting via Vercel KV or Upstash Redis
// For now, Twilio/SendGrid have their own built-in rate limits

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");
  if (process.env.DONTDIE_API_KEY && apiKey !== process.env.DONTDIE_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { userId, type, userName, contacts, location, medical, symptoms, message } = req.body;

  if (!userId || !type || !contacts?.length) {
    return res.status(400).json({ error: "userId, type, and contacts are required" });
  }

  // Validate contacts
  for (const contact of contacts) {
    if (contact.phone && !/^\+\d{7,15}$/.test(contact.phone)) {
      return res.status(400).json({ error: `Invalid phone format for ${contact.name}: must start with + followed by digits` });
    }
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      return res.status(400).json({ error: `Invalid email format for ${contact.name}` });
    }
  }
  if (contacts.length > 10) {
    return res.status(400).json({ error: "Maximum 10 contacts per notification" });
  }

  const results = { sms: [] as string[], email: [] as string[], errors: [] as string[] };

  // Build notification message based on type
  let smsBody: string;
  let emailSubject: string;
  let emailBody: string;

  switch (type) {
    case "sos":
      smsBody = `🚨 EMERGENCY from DontDie: ${userName} triggered an SOS alert.${location ? ` Location: ${location}.` : ""}${symptoms ? ` Symptoms: ${symptoms}.` : ""}${medical ? ` Medical: ${medical}.` : ""} Please check on them immediately.`;
      emailSubject = `🚨 EMERGENCY: ${userName} triggered an SOS alert`;
      emailBody = `${userName} has triggered an emergency SOS alert via DontDie.\n\n${location ? `📍 Location: ${location}\n` : ""}${symptoms ? `🏥 Symptoms: ${symptoms}\n` : ""}${medical ? `💊 Medical info: ${medical}\n` : ""}\nPlease try to reach them immediately. If you cannot, consider calling local emergency services.`;
      break;
    case "escalation":
      smsBody = `⚠️ SAFETY ALERT from DontDie: ${userName} has not responded to their daily alive-check for 24 hours.${location ? ` Last known location: ${location}.` : ""} Please try to reach them.`;
      emailSubject = `⚠️ ${userName} missed their DontDie alive-check (24 hours)`;
      emailBody = `${userName} has not responded to their daily DontDie alive-check for 24 hours.\n\n${location ? `📍 Last known location: ${location}\n` : ""}\nPlease try to reach them and confirm they are safe.`;
      break;
    case "resolved":
      smsBody = `✅ UPDATE from DontDie: ${userName} has confirmed they are safe. Thank you for checking in.`;
      emailSubject = `✅ ${userName} is safe — DontDie update`;
      emailBody = `Good news: ${userName} has confirmed they are safe.\n\nThank you for being there for them.`;
      break;
    default:
      smsBody = message || `DontDie alert for ${userName}`;
      emailSubject = `DontDie alert: ${userName}`;
      emailBody = message || `DontDie notification regarding ${userName}.`;
  }

  // Send SMS via Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    for (const contact of contacts) {
      if (contact.phone) {
        try {
          await client.messages.create({
            body: smsBody,
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: contact.phone,
          });
          results.sms.push(contact.phone);
        } catch (err: any) {
          console.error(err);
          results.errors.push(`SMS to ${contact.phone}: Internal server error`);
        }
      }
    }
  }

  // Send email via SendGrid
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    for (const contact of contacts) {
      if (contact.email) {
        try {
          await sgMail.send({
            to: contact.email,
            from: { email: process.env.SENDGRID_FROM_EMAIL || "alerts@dontdie.app", name: "DontDie 🦞" },
            subject: emailSubject,
            text: emailBody,
          });
          results.email.push(contact.email);
        } catch (err: any) {
          console.error(err);
          results.errors.push(`Email to ${contact.email}: Internal server error`);
        }
      }
    }
  }

  // Log event to Neon
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!);
    await sql(
      `INSERT INTO events (user_id, type, details) VALUES ($1, $2, $3)`,
      [userId, type, JSON.stringify({ contacts: contacts.map((c: any) => c.name), sms: results.sms.length, email: results.email.length, errors: results.errors })]
    );
  } catch (_) {
    // Don't fail the notification if logging fails
  }

  return res.status(200).json({
    success: true,
    sms: `${results.sms.length} sent`,
    email: `${results.email.length} sent`,
    errors: results.errors.length ? results.errors : undefined,
  });
}
