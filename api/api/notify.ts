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
  const now = new Date().toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC";

  // Build detailed notification messages
  let smsBody: string;
  let emailSubject: string;
  let emailBody: string;

  // Medical card block (reused across types)
  const medicalBlock = medical
    ? `\n🏥 MEDICAL INFO:\n${medical}\n`
    : "";
  const locationBlock = location
    ? `\n📍 LOCATION: ${location}\n`
    : "";
  const symptomsBlock = symptoms
    ? `\n⚠️ SYMPTOMS: ${symptoms}\n`
    : "";

  switch (type) {
    case "sos":
      smsBody = [
        `🚨 EMERGENCY ALERT — DontDie`,
        ``,
        `${userName} has triggered an SOS at ${now}.`,
        location ? `📍 Location: ${location}` : `📍 Location: unknown`,
        symptoms ? `⚠️ Symptoms: ${symptoms}` : ``,
        medical ? `🏥 Medical: ${medical}` : ``,
        ``,
        `⟹ PLEASE DO ONE OF THESE NOW:`,
        `1. Try calling ${userName} immediately`,
        `2. If no answer, call local emergency services (120/911/112)`,
        `3. Go to their location if you can`,
        ``,
        `This is an automated alert from DontDie 🦞`,
      ].filter(Boolean).join("\n");

      emailSubject = `🚨 EMERGENCY: ${userName} needs help — SOS triggered at ${now}`;
      emailBody = [
        `EMERGENCY ALERT`,
        `═══════════════════════════════════`,
        ``,
        `${userName} has triggered an SOS emergency alert.`,
        ``,
        `⏰ TIME: ${now}`,
        locationBlock,
        symptomsBlock,
        medicalBlock,
        `═══════════════════════════════════`,
        `WHAT YOU SHOULD DO:`,
        `═══════════════════════════════════`,
        ``,
        `1. Try calling ${userName} RIGHT NOW`,
        `2. If they don't answer, call local emergency services:`,
        `   • China: 120`,
        `   • US/Canada: 911`,
        `   • EU: 112`,
        `   • UK: 999`,
        `   • Australia: 000`,
        `3. If you're nearby, go to their location immediately`,
        `4. If you reach them, reply to this email so we can update others`,
        ``,
        `This message was sent because ${userName} listed you as an emergency contact on DontDie.`,
        `DontDie is an AI safety tool that monitors daily well-being. 🦞`,
      ].filter(Boolean).join("\n");
      break;

    case "escalation":
      // 24h — gentle, just ask to call
      smsBody = [
        `📞 Hey, this is DontDie (${userName}'s safety assistant).`,
        ``,
        `${userName} hasn't responded to their daily check-in for 24 hours.`,
        `Could you give them a quick call to make sure they're okay?`,
        location ? `📍 Last known location: ${location}` : ``,
        ``,
        `It's probably nothing — but a quick call would put everyone at ease. Thanks! 🦞`,
      ].filter(Boolean).join("\n");

      emailSubject = `📞 Can you check on ${userName}? (24h no response — DontDie)`;
      emailBody = [
        `Hey there,`,
        ``,
        `${userName} hasn't responded to their daily DontDie alive-check for 24 hours.`,
        ``,
        `Could you please give them a call or text to make sure everything is okay?`,
        ``,
        `⏰ Last check-in: ${now}`,
        locationBlock,
        medicalBlock,
        `It's probably nothing — phone died, busy day, etc. But ${userName} set up DontDie`,
        `specifically so someone would notice if they went quiet. That someone is you.`,
        ``,
        `A quick call is all it takes. Thank you! 🦞`,
        ``,
        `— DontDie (${userName}'s AI safety assistant)`,
      ].filter(Boolean).join("\n");
      break;

    case "escalation_48h":
      // 48h — urgent, serious tone
      smsBody = [
        `🚨 URGENT — DontDie`,
        ``,
        `${userName} has been UNREACHABLE for 48 HOURS.`,
        `They have not responded to any check-ins or messages.`,
        location ? `📍 Last known location: ${location}` : `📍 Location: unknown`,
        medical ? `🏥 Medical: ${medical}` : ``,
        ``,
        `⟹ ACTION REQUIRED:`,
        `1. Call ${userName} NOW`,
        `2. If no answer — go to their home or call police for a welfare check`,
        `3. Emergency services: 120 (CN) / 911 (US) / 112 (EU)`,
        ``,
        `This is serious. 48 hours of silence is not normal. Please act now.`,
        `— DontDie 🦞`,
      ].filter(Boolean).join("\n");

      emailSubject = `🚨 URGENT: ${userName} unreachable for 48 hours — please act now`;
      emailBody = [
        `⚠️ URGENT SAFETY ALERT — 48 HOURS NO RESPONSE`,
        `═══════════════════════════════════`,
        ``,
        `${userName} has been completely unreachable for 48 hours.`,
        `No response to any check-ins, messages, or previous alerts.`,
        ``,
        `⏰ LAST SEEN: ${now}`,
        locationBlock,
        medicalBlock,
        `═══════════════════════════════════`,
        `ACTION REQUIRED — THIS IS SERIOUS`,
        `═══════════════════════════════════`,
        ``,
        `1. Call ${userName} immediately — try multiple times`,
        `2. If they don't answer, GO TO THEIR HOME if possible`,
        `3. If you cannot go, call local police for a welfare check:`,
        `   • China: 110 (police) / 120 (medical)`,
        `   • US/Canada: 911`,
        `   • EU: 112`,
        `   • UK: 999`,
        ``,
        `48 hours of complete silence from someone living alone is a serious warning sign.`,
        `Please take action now. Better to feel embarrassed than to be too late.`,
        ``,
        `— DontDie 🦞`,
      ].filter(Boolean).join("\n");
      break;

    case "resolved":
      smsBody = `✅ UPDATE from DontDie: ${userName} has confirmed they are safe at ${now}. Thank you for checking in. 🦞`;
      emailSubject = `✅ ${userName} is safe — DontDie update`;
      emailBody = [
        `GOOD NEWS`,
        `═══════════════════════════════════`,
        ``,
        `${userName} has confirmed they are safe at ${now}.`,
        ``,
        `Thank you for being there for them.`,
        `If you already called emergency services, you may want to let them know the person is okay.`,
        ``,
        `— DontDie 🦞`,
      ].join("\n");
      break;

    case "location_update":
      smsBody = `📍 LOCATION UPDATE for ${userName}: ${location || "unknown"}. SOS is still active. ${now}. — DontDie 🦞`;
      emailSubject = `📍 Location update: ${userName} — SOS still active`;
      emailBody = [
        `LOCATION UPDATE`,
        `═══════════════════════════════════`,
        ``,
        `${userName}'s location has been updated.`,
        ``,
        `⏰ TIME: ${now}`,
        `📍 LOCATION: ${location || "unknown"}`,
        ``,
        `The SOS alert is still active. Please continue trying to reach them.`,
        ``,
        `— DontDie 🦞`,
      ].join("\n");
      break;

    default:
      smsBody = message || `DontDie alert for ${userName} at ${now}`;
      emailSubject = `DontDie alert: ${userName}`;
      emailBody = message || `DontDie notification regarding ${userName} at ${now}.`;
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
