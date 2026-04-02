// AI-powered product report generator
// POST /api/report
// Body: { asin, title, category, rootCategory, brand, snapshots }
// Returns structured report JSON cached by asin + last snapshot timestamp

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { asin, title, category, rootCategory, brand, snapshots } = req.body;
  if (!asin || !snapshots || !snapshots.length) {
    return res.status(400).json({ error: 'asin and snapshots required' });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY;

  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'AI not configured' });

  const lastSnap   = snapshots[snapshots.length - 1];
  const lastSnapTs = lastSnap.timestamp;
  const snapCount  = snapshots.length;

  // Check cache first
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const cacheRes = await fetch(
        `${SUPABASE_URL}/rest/v1/reports?asin=eq.${encodeURIComponent(asin)}&last_snapshot_ts=eq.${lastSnapTs}&select=report`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const cached = await cacheRes.json();
      if (cached && cached[0]) return res.status(200).json(cached[0].report);
    } catch(e) {}
  }

  // Build snapshot table for prompt (last 20 points)
  const recentSnaps = snapshots.slice(-20);
  const snapRows = recentSnaps.map(s => {
    const d = new Date(s.timestamp).toLocaleDateString();
    return `${d}: Price=$${s.price ?? 'N/A'} BSR=#${s.bsr ?? 'N/A'} Reviews=${s.reviews ?? 'N/A'} Rating=${s.rating ?? 'N/A'} Sellers=${s.sellers ?? 'N/A'}`;
  }).join('\n');

  const first     = snapshots[0];
  const last      = snapshots[snapshots.length - 1];
  const daysSince = Math.max(1, Math.floor((last.timestamp - first.timestamp) / 86400000));

  const bsrTrend = (first.bsr && last.bsr)
    ? `${first.bsr} → ${last.bsr} (${last.bsr < first.bsr ? 'improved' : 'declined'} ${Math.abs(Math.round((last.bsr - first.bsr) / first.bsr * 100))}%)`
    : 'insufficient data';
  const priceTrend = (first.price && last.price)
    ? `$${first.price} → $${last.price}`
    : 'insufficient data';
  const reviewVelocity = (first.reviews && last.reviews && daysSince > 0)
    ? `${first.reviews} → ${last.reviews} (~${Math.round((last.reviews - first.reviews) / (daysSince / 7))}/week)`
    : 'insufficient data';

  const prompt = `You are a senior Amazon FBA product research analyst. Analyze this product data and return a JSON assessment for a seller deciding whether to source this product.

PRODUCT:
Title: ${title || 'Unknown'}
ASIN: ${asin}
Category: ${category || 'Unknown'}${rootCategory ? ` (${rootCategory})` : ''}
Brand: ${brand || 'Unknown'}
Tracking period: ${daysSince} days | Snapshots: ${snapCount}

SNAPSHOT HISTORY (${recentSnaps.length} most recent data points):
${snapRows}

KEY TRENDS:
- BSR: ${bsrTrend}
- Price: ${priceTrend}
- Reviews: ${reviewVelocity}
- Current sellers: ${last.sellers ?? 'unknown'}
- Current rating: ${last.rating ?? 'unknown'}

Return ONLY valid JSON with no markdown or explanation:
{
  "verdict": "one sharp sentence on the FBA opportunity",
  "opportunityScore": 0-100,
  "listingRisk": "Low|Medium|High",
  "confidenceLabel": "Low|Medium|High",
  "confidenceScore": 0-100,
  "isEarlyRead": true or false,
  "earlyReadNotice": "brief explanation if isEarlyRead, else null",
  "summary": "2-3 sentence executive summary",
  "demand": "paragraph on demand signals from BSR and velocity",
  "competition": "paragraph on competitive dynamics and barriers",
  "priceHealth": "paragraph on price stability and margin potential",
  "nextMoveTitle": "short action title",
  "nextMoveBody": "specific actionable recommendation with reasoning",
  "strengths": ["up to 3 strengths"],
  "weaknesses": ["up to 2 weaknesses"],
  "opportunities": ["up to 2 opportunities"],
  "threats": ["up to 2 threats"],
  "whyKeen": ["key data signal 1", "key data signal 2", "key data signal 3"],
  "bullets": ["raw observation 1", "raw observation 2", "raw observation 3"],
  "trendConfidence": "Low|Medium|High",
  "dailySalesLow": integer or null,
  "dailySalesHigh": integer or null
}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!aiRes.ok) {
      console.error('Claude API error:', await aiRes.text());
      return res.status(500).json({ error: 'AI analysis failed' });
    }

    const aiData = await aiRes.json();
    const raw    = aiData.content[0].text.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch(e) {
      const match = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
      if (match) parsed = JSON.parse(match[1]);
      else throw new Error('Could not parse AI response as JSON');
    }

    const report = {
      title,
      asin,
      verdict:        parsed.verdict,
      opportunityScore: parsed.opportunityScore,
      listingRisk:    parsed.listingRisk,
      confidence:     { label: parsed.confidenceLabel, score: parsed.confidenceScore },
      isEarlyRead:    parsed.isEarlyRead || snapCount < 3,
      earlyReadNotice: parsed.earlyReadNotice || null,
      summary:        parsed.summary,
      sections: {
        demand:      parsed.demand,
        competition: parsed.competition,
        priceHealth: parsed.priceHealth,
        nextMove:    { title: parsed.nextMoveTitle, body: parsed.nextMoveBody },
        swot: {
          strengths:     parsed.strengths     || [],
          weaknesses:    parsed.weaknesses    || [],
          opportunities: parsed.opportunities || [],
          threats:       parsed.threats       || []
        },
        whyKeen: parsed.whyKeen || []
      },
      bullets:   parsed.bullets || [],
      executive: {
        trendConfidence: parsed.trendConfidence,
        snapshotCount:   snapCount,
        avgPrice:        null,
        avgBsr:          null,
        lastUpdated:     last.timestamp
      },
      salesRange: (parsed.dailySalesLow && parsed.dailySalesHigh) ? {
        dailyLow:    parsed.dailySalesLow,
        dailyHigh:   parsed.dailySalesHigh,
        monthlyLow:  Math.round(parsed.dailySalesLow * 30),
        monthlyHigh: Math.round(parsed.dailySalesHigh * 30)
      } : null,
      aiGenerated: true,
      generatedAt: Date.now()
    };

    // Cache in Supabase (fire and forget)
    if (SUPABASE_URL && SUPABASE_KEY) {
      fetch(`${SUPABASE_URL}/rest/v1/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ asin, last_snapshot_ts: lastSnapTs, report })
      }).catch(() => {});
    }

    return res.status(200).json(report);
  } catch(err) {
    console.error('Report generation error:', err);
    return res.status(500).json({ error: 'Report generation failed' });
  }
}
