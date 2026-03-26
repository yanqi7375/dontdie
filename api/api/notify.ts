// Retry logic is handled by the calling agent (OpenClaw skill).
// Supports idempotency via X-Idempotency-Key header.
// Without the header, duplicate calls WILL send duplicate notifications.

// TODO: Add rate limiting via Vercel KV or Upstash Redis
// For now, Twilio/Resend have their own built-in rate limits

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import twilio from "twilio";
import { Resend } from "resend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");
  if (!process.env.DONTDIE_API_KEY || apiKey !== process.env.DONTDIE_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sql = neon(process.env.NEON_DATABASE_URL!);

  // Idempotency: prevent duplicate notifications
  const idempotencyKey = req.headers["x-idempotency-key"] as string;
  if (idempotencyKey) {
    try {
      const [existing] = await sql(
        `SELECT id FROM events WHERE details->>'idempotencyKey' = $1 LIMIT 1`,
        [idempotencyKey]
      );
      if (existing) {
        return res.status(200).json({ success: true, deduplicated: true, message: "Already processed" });
      }
    } catch (_) {
      // If dedup check fails, proceed anyway — better to double-notify than not notify
    }
  }

  const { userId, type, userName: rawUserName, location, medical, symptoms, message } = req.body;

  // Validate notification type whitelist
  const allowedTypes = ["sos", "escalation", "escalation_48h", "resolved", "location_update"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid notification type. Allowed: ${allowedTypes.join(", ")}` });
  }

  if (!userId || !type) {
    return res.status(400).json({ error: "userId and type are required" });
  }

  // Sanitize userName: strip URLs, limit to 100 chars, alphanumeric + spaces + basic Unicode only
  const userName = rawUserName
    ? String(rawUserName)
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/[^\p{L}\p{N}\s'-]/gu, "")
        .trim()
        .slice(0, 100)
    : "Unknown";

  // Rate limiting: max 10 notifications per user per hour
  try {
    const recent = await sql(`SELECT count(*) FROM events WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`, [userId]);
    if (Number(recent[0].count) >= 10) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
  } catch (_) {
    // If rate limit check fails, proceed — safety notifications should not be blocked
  }

  // Fetch contacts from database instead of accepting from request body
  const contactRows = await sql(`SELECT name, phone, email FROM contacts WHERE user_id = $1`, [userId]);
  const contacts = contactRows as { name: string; phone?: string; email?: string }[];

  if (!contacts.length) {
    return res.status(400).json({ error: "No contacts found for this user. Register contacts first." });
  }

  // Payment gate: check if user is on paid plan or within trial
  {
    const userCheck = await sql(
      `SELECT created_at, plan, paid FROM users WHERE id = $1`,
      [userId]
    );

    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userCheck[0];

    // Self-hosted users bypass payment check
    if (user.plan === 'self-hosted') {
      // continue to notifications
    } else {
      // Cloud plan: check trial (3 days) or paid status
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const isTrialActive = daysSinceCreation <= 3;
      const isPaid = user.paid === true;

      if (!isTrialActive && !isPaid) {
        return res.status(403).json({
          error: "Trial expired. Upgrade to continue notifications.",
          upgradeUrl: "https://buy.stripe.com/dontdie",
          trialDaysUsed: Math.floor(daysSinceCreation)
        });
      }
    }
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
      // Should never reach here due to type whitelist above
      return res.status(400).json({ error: "Invalid notification type" });
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

  // Send email via Resend
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const contact of contacts) {
      if (contact.email) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "DontDie <onboarding@resend.dev>",
            to: contact.email,
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
    await sql(
      `INSERT INTO events (user_id, type, details) VALUES ($1, $2, $3)`,
      [userId, type, JSON.stringify({ idempotencyKey, contacts: contacts.map((c: any) => c.name), sms: results.sms.length, email: results.email.length, errors: results.errors })]
    );
  } catch (_) {
    // Don't fail the notification if logging fails
  }

  // Log to Civic audit trail
  if (process.env.CIVIC_URL && process.env.CIVIC_TOKEN) {
    try {
      await fetch(process.env.CIVIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CIVIC_TOKEN}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "audit_log",
            arguments: {
              action: `dontdie_${type}`,
              userId,
              userName,
              contactsNotified: contacts.map((c: any) => c.name),
              smsCount: results.sms.length,
              emailCount: results.email.length,
              timestamp: new Date().toISOString(),
              errors: results.errors,
            }
          },
          id: Date.now(),
        }),
      });
    } catch (_) {
      // Civic logging is best-effort, don't fail notifications
    }
  }

  const totalSent = results.sms.length + results.email.length;
  const totalContacts = contacts.length;

  if (totalSent === 0 && results.errors.length > 0) {
    // Nothing was delivered — this is a FAILURE for a safety product
    return res.status(502).json({
      success: false,
      error: "Failed to deliver any notifications",
      sms: `${results.sms.length}/${totalContacts} sent`,
      email: `${results.email.length}/${totalContacts} sent`,
      errors: results.errors,
    });
  }

  return res.status(200).json({
    success: totalSent > 0,
    sms: `${results.sms.length} sent`,
    email: `${results.email.length} sent`,
    warnings: totalSent < totalContacts ? `${totalContacts - totalSent} contacts not reached` : undefined,
    errors: results.errors.length ? results.errors : undefined,
  });
}
