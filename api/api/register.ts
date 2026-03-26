import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sql = neon(process.env.NEON_DATABASE_URL!);
  const { name, openclawUserId, language, checkinTime, timezone, contacts, plan } =
    req.body;

  if (!name || !openclawUserId || !contacts?.length) {
    return res.status(400).json({ error: "name, openclawUserId, and contacts are required" });
  }

  // Input length validation
  if (String(name).length > 100) {
    return res.status(400).json({ error: "Name must be 100 characters or fewer" });
  }
  if (language && String(language).length > 10) {
    return res.status(400).json({ error: "Language must be 10 characters or fewer" });
  }
  if (timezone && String(timezone).length > 50) {
    return res.status(400).json({ error: "Timezone must be 50 characters or fewer" });
  }
  if (contacts.length > 5) {
    return res.status(400).json({ error: "Maximum 5 contacts allowed" });
  }

  // Validate plan if provided
  const validPlans = ['cloud', 'self-hosted'];
  const userPlan = plan && validPlans.includes(plan) ? plan : 'cloud';

  // Validate contacts format
  for (const contact of contacts) {
    if (!contact.name) {
      return res.status(400).json({ error: "Each contact must have a name" });
    }
    if (contact.phone && !/^\+\d{7,15}$/.test(contact.phone)) {
      return res.status(400).json({ error: `Invalid phone for ${contact.name}: must start with + and have 7-15 digits` });
    }
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      return res.status(400).json({ error: `Invalid email for ${contact.name}` });
    }
    if (!contact.phone && !contact.email) {
      return res.status(400).json({ error: `${contact.name} needs at least a phone or email` });
    }
  }
  if (contacts.length > 5) {
    return res.status(400).json({ error: "Maximum 5 contacts" });
  }

  try {
    const [user] = await sql(
      `INSERT INTO users (name, openclaw_user_id, language, checkin_time, timezone, plan, paid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (openclaw_user_id) DO UPDATE SET name=$1, language=$3, checkin_time=$4, timezone=$5, plan=$6
       RETURNING id`,
      [name, openclawUserId, language || "en", checkinTime || "09:00", timezone || "America/New_York", userPlan, false]
    );

    // Delete existing contacts before inserting new ones (handles re-registration)
    await sql(`DELETE FROM contacts WHERE user_id = $1`, [user.id]);

    for (const contact of contacts) {
      await sql(
        `INSERT INTO contacts (user_id, name, phone, email)
         VALUES ($1, $2, $3, $4)`,
        [user.id, contact.name, contact.phone, contact.email]
      );
    }

    await sql(
      `INSERT INTO events (user_id, type, details) VALUES ($1, 'register', $2)`,
      [user.id, JSON.stringify({ contactCount: contacts.length })]
    );

    return res.status(200).json({
      userId: user.id,
      registered: true
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
}
