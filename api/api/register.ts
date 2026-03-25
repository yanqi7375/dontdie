import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sql = neon(process.env.NEON_DATABASE_URL!);
  const { name, openclawUserId, language, checkinTime, timezone, contacts } =
    req.body;

  if (!name || !openclawUserId || !contacts?.length) {
    return res.status(400).json({ error: "name, openclawUserId, and contacts are required" });
  }

  try {
    const [user] = await sql(
      `INSERT INTO users (name, openclaw_user_id, language, checkin_time, timezone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (openclaw_user_id) DO UPDATE SET name=$1, language=$3, checkin_time=$4, timezone=$5
       RETURNING id`,
      [name, openclawUserId, language || "en", checkinTime || "09:00", timezone || "America/New_York"]
    );

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

    return res.status(200).json({ userId: user.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
