import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  // Stripe Checkout Session
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{
      price: process.env.STRIPE_PRICE_ID, // $2.90/quarter price ID from Stripe dashboard
      quantity: 1,
    }],
    metadata: { userId },
    success_url: `${process.env.DONTDIE_API_URL || "https://api-five-eta-64.vercel.app"}/api/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: "https://github.com/yanqi7375/dontdie",
  });

  return res.status(200).json({ url: session.url });
}
