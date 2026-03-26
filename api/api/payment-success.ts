import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple redirect/confirmation page
  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head><title>DontDie - Payment Success</title></head>
    <body style="background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
      <div>
        <h1 style="font-size:64px">🦞</h1>
        <h2>Payment successful!</h2>
        <p style="color:#888">Your emergency contacts will now be notified. Go back to your chat and try not to die.</p>
      </div>
    </body>
    </html>
  `);
}
