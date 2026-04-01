// Weekly category movers digest
// Triggered by Vercel Cron (see vercel.json) or manually via POST
// Requires env vars: RESEND_API_KEY, MAILCHIMP_API_KEY, MAILCHIMP_AUDIENCE_ID, MAILCHIMP_DC
// DIGEST_SECRET — optional shared secret to protect manual POST calls

const DIGEST_FROM    = 'Keen <digest@keen.technology>';
const DIGEST_SUBJECT = 'Your weekly Amazon trend digest';
const WINDOW_DAYS    = 7;
const TOP_N          = 5;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // All requests require the secret
  const secret = process.env.DIGEST_SECRET;
  if (!secret || req.headers['x-digest-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const RESEND_KEY    = process.env.RESEND_API_KEY;
  const MC_KEY        = process.env.MAILCHIMP_API_KEY;
  const MC_AUDIENCE   = process.env.MAILCHIMP_AUDIENCE_ID;
  const MC_DC         = process.env.MAILCHIMP_DC;

  if (!RESEND_KEY || !MC_KEY || !MC_AUDIENCE || !MC_DC) {
    return res.status(500).json({ error: 'Missing required env vars' });
  }

  try {
    // 1. Fetch subscribers from Mailchimp
    const mcRes = await fetch(
      `https://${MC_DC}.api.mailchimp.com/3.0/lists/${MC_AUDIENCE}/members?status=subscribed&count=500&fields=members.email_address`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`anystring:${MC_KEY}`).toString('base64')
        }
      }
    );
    if (!mcRes.ok) {
      const err = await mcRes.text();
      console.error('Mailchimp fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
    const mcData = await mcRes.json();
    const subscribers = (mcData.members || []).map(m => m.email_address).filter(Boolean);

    if (!subscribers.length) {
      return res.status(200).json({ sent: 0, message: 'No subscribers yet' });
    }

    // 2. Fetch category movers
    const host = req.headers.host ? `https://${req.headers.host}` : 'https://keen.technology';
    const moversRes = await fetch(`${host}/api/category-movers?windowDays=${WINDOW_DAYS}&topN=${TOP_N}`);
    const moversData = moversRes.ok ? await moversRes.json() : null;

    // 3. Build email HTML
    const html = buildDigestHtml(moversData);
    const text = buildDigestText(moversData);

    // 4. Send to each subscriber via Resend
    let sent = 0;
    let failed = 0;
    for (const email of subscribers) {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_KEY}`
        },
        body: JSON.stringify({
          from: DIGEST_FROM,
          to: email,
          subject: DIGEST_SUBJECT,
          html,
          text
        })
      });
      if (sendRes.ok) { sent++; } else { failed++; console.error('Resend failed for', email, await sendRes.text()); }
    }

    return res.status(200).json({ sent, failed, subscribers: subscribers.length });

  } catch (err) {
    console.error('Digest error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function buildDigestHtml(data) {
  const categories = data && data.categories ? data.categories : {};
  const categoryKeys = Object.keys(categories);
  const windowDays = data && data.meta ? data.meta.windowDays : WINDOW_DAYS;
  const generated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const categoryBlocks = categoryKeys.length
    ? categoryKeys.map(cat => {
        const d = categories[cat];
        const climbers = d.climbers || [];
        const decliners = d.decliners || [];
        if (!climbers.length && !decliners.length) return '';

        const climberRows = climbers.slice(0, TOP_N).map(p => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#e2e8f0">${escText(p.title || p.asin)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#4ade80;text-align:right;white-space:nowrap">▲ ${Math.abs(p.bsr.pctMove)}%</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:12px;color:#94a3b8;text-align:right">#${p.bsr.current.toLocaleString()}</td>
          </tr>`).join('');

        const declinerRows = decliners.slice(0, 3).map(p => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#e2e8f0">${escText(p.title || p.asin)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#f87171;text-align:right;white-space:nowrap">▼ ${Math.abs(p.bsr.pctMove)}%</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:12px;color:#94a3b8;text-align:right">#${p.bsr.current.toLocaleString()}</td>
          </tr>`).join('');

        return `
          <div style="margin-bottom:28px">
            <h3 style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#38bdf8">${escText(cat)}</h3>
            ${climberRows ? `
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:.08em">Top Climbers</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden">
                <thead><tr>
                  <th style="padding:8px 12px;background:#1a1a2e;font-size:11px;font-weight:700;color:#94a3b8;text-align:left">Product</th>
                  <th style="padding:8px 12px;background:#1a1a2e;font-size:11px;font-weight:700;color:#94a3b8;text-align:right">BSR Move</th>
                  <th style="padding:8px 12px;background:#1a1a2e;font-size:11px;font-weight:700;color:#94a3b8;text-align:right">Current BSR</th>
                </tr></thead>
                <tbody>${climberRows}</tbody>
              </table>` : ''}
            ${declinerRows ? `
              <p style="margin:14px 0 6px;font-size:11px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:.08em">Notable Drops</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden">
                <thead><tr>
                  <th style="padding:8px 12px;background:#1a1a2e;font-size:11px;font-weight:700;color:#94a3b8;text-align:left">Product</th>
                  <th style="padding:8px 12px;background:#1a1a2e;font-size:11px;font-weight:700;color:#94a3b8;text-align:right">BSR Move</th>
                  <th style="padding:8px 12px;background:#1a1a2e;font-size:11px;font-weight:700;color:#94a3b8;text-align:right">Current BSR</th>
                </tr></thead>
                <tbody>${declinerRows}</tbody>
              </table>` : ''}
          </div>`;
      }).filter(Boolean).join('')
    : '<p style="color:#94a3b8;font-size:14px">Not enough data collected yet — keep tracking products and the next digest will have movement data.</p>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="margin-bottom:32px;text-align:center">
      <div style="font-size:22px;font-weight:900;color:#38bdf8;letter-spacing:.04em;margin-bottom:4px">KEEN</div>
      <div style="font-size:13px;color:#64748b">Weekly Amazon Trend Digest · ${escText(generated)}</div>
    </div>

    <!-- Intro -->
    <div style="background:#1a1a2e;border:1px solid #2a2a2a;border-radius:12px;padding:20px 24px;margin-bottom:28px">
      <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6">
        Here's what moved in your tracked categories over the last <strong style="color:#e2e8f0">${windowDays} days</strong>.
        BSR rank improvements mean growing demand — these are the products worth watching.
      </p>
    </div>

    <!-- Category Blocks -->
    ${categoryBlocks}

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1e1e2e;text-align:center">
      <p style="margin:0 0 8px;font-size:12px;color:#475569">
        You're receiving this because you signed up at <a href="https://keen.technology" style="color:#38bdf8;text-decoration:none">keen.technology</a>
      </p>
      <p style="margin:0;font-size:11px;color:#334155">Keen — Sharper Product Intelligence</p>
    </div>

  </div>
</body>
</html>`;
}

function buildDigestText(data) {
  const categories = data && data.categories ? data.categories : {};
  const lines = ['KEEN WEEKLY DIGEST', new Date().toLocaleDateString(), ''];

  for (const [cat, d] of Object.entries(categories)) {
    lines.push(cat.toUpperCase());
    if (d.climbers && d.climbers.length) {
      lines.push('Top Climbers:');
      d.climbers.slice(0, TOP_N).forEach(p => {
        lines.push(`  ${p.title || p.asin} — BSR moved ${p.bsr.pctMove}% → #${p.bsr.current.toLocaleString()}`);
      });
    }
    if (d.decliners && d.decliners.length) {
      lines.push('Notable Drops:');
      d.decliners.slice(0, 3).forEach(p => {
        lines.push(`  ${p.title || p.asin} — BSR moved +${p.bsr.pctMove}% → #${p.bsr.current.toLocaleString()}`);
      });
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('keen.technology');
  return lines.join('\n');
}

function escText(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}
