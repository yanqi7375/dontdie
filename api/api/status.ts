import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!);
    const [{ count }] = await sql(`SELECT count(*) FROM users`);
    return res.status(200).json({
      status: "alive 🦞",
      users: Number(count),
      version: "2.0.0",
    });
  } catch (err: any) {
    return res.status(500).json({ status: "dead 💀", error: err.message });
  }
}
