import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    // For raw body, Vercel needs special config
    event = stripe.webhooks.constructEvent(
      JSON.stringify(req.body),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const sql = neon(process.env.NEON_DATABASE_URL!);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      await sql(`UPDATE users SET paid = true WHERE id = $1`, [userId]);
      console.log(`User ${userId} upgraded to paid`);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const session = await stripe.checkout.sessions.list({
      subscription: subscription.id,
      limit: 1,
    });
    const userId = session.data[0]?.metadata?.userId;
    if (userId) {
      await sql(`UPDATE users SET paid = false WHERE id = $1`, [userId]);
      console.log(`User ${userId} subscription cancelled`);
    }
  }

  return res.status(200).json({ received: true });
}
