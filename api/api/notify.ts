import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, type, userName, contacts, location, medical, symptoms, message } = req.body;

  if (!userId || !type || !contacts?.length) {
    return res.status(400).json({ error: "userId, type, and contacts are required" });
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
          results.errors.push(`SMS to ${contact.phone}: ${err.message}`);
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
          results.errors.push(`Email to ${contact.email}: ${err.message}`);
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
