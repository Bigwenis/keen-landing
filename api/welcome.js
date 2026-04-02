// Sends a welcome email to a new user via Resend
// Called from signup.html after successful Supabase Auth signup

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://keen.technology');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'Email not configured' });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">

    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:24px;font-weight:900;color:#38bdf8;letter-spacing:.04em">KEEN.</div>
    </div>

    <div style="background:#111827;border:1px solid #1e2a3a;border-radius:16px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f1f5f9">You're in.</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">
        Welcome to Keen — your account is ready. Here's what to do next.
      </p>

      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(56,189,248,.15);border:1px solid rgba(56,189,248,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:800;color:#38bdf8;text-align:center;line-height:28px">1</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:3px">Install the Chrome extension</div>
            <div style="font-size:13px;color:#64748b">Free on the Chrome Web Store — adds a Track button to every Amazon product page.</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(56,189,248,.15);border:1px solid rgba(56,189,248,.25);flex-shrink:0;font-size:13px;font-weight:800;color:#38bdf8;text-align:center;line-height:28px">2</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:3px">Track products on Amazon</div>
            <div style="font-size:13px;color:#64748b">Visit any Amazon product and click Track. Keen captures BSR, price, reviews, and more automatically.</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:14px">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(56,189,248,.15);border:1px solid rgba(56,189,248,.25);flex-shrink:0;font-size:13px;font-weight:800;color:#38bdf8;text-align:center;line-height:28px">3</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:3px">Open your dashboard</div>
            <div style="font-size:13px;color:#64748b">See trending products, brand intelligence, and your full report for every tracked ASIN.</div>
          </div>
        </div>
      </div>

      <a href="https://keen.technology/dashboard" style="display:block;text-align:center;padding:14px;border-radius:10px;background:#38bdf8;color:#0a0e1a;font-size:14px;font-weight:800;text-decoration:none;margin-top:24px">Go to your dashboard →</a>
    </div>

    <div style="margin-top:28px;text-align:center">
      <p style="font-size:12px;color:#334155;margin:0">
        Questions? Reply to this email or reach us at <a href="mailto:hello@keen.technology" style="color:#38bdf8;text-decoration:none">hello@keen.technology</a>
      </p>
      <p style="font-size:11px;color:#1e293b;margin:8px 0 0">Keen — Sharper Product Intelligence · <a href="https://keen.technology" style="color:#334155;text-decoration:none">keen.technology</a></p>
    </div>

  </div>
</body>
</html>`;

  const text = `Welcome to Keen.

Your account is ready. Here's what to do next:

1. Install the Chrome extension (free on the Chrome Web Store)
2. Track products on Amazon — click Track on any product page
3. Open your dashboard at keen.technology/dashboard

Questions? Email hello@keen.technology

Keen — keen.technology`;

  try {
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Keen <hello@keen.technology>',
        to: email,
        subject: "You're in — here's how to get started",
        html,
        text
      })
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
