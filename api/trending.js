export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Optional filters: category, rootCategory, limit (default 20), windowDays (default 7)
  const category    = req.query.category    || null;
  const rootCategory = req.query.rootCategory || null;
  const limit       = Math.min(parseInt(req.query.limit) || 20, 100);
  const windowDays  = Math.min(parseInt(req.query.windowDays) || 7, 90);

  const SUPABASE_URL    = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const windowStart = Date.now() - windowDays * 86400000;

  try {
    // Pull all snapshots within the window (and a matching baseline just before it)
    // We fetch recent + slightly older data so we can compute delta
    const lookbackStart = Date.now() - windowDays * 2 * 86400000;

    let url = `${SUPABASE_URL}/rest/v1/snapshots?timestamp=gte.${lookbackStart}&select=asin,bsr,price,reviews,timestamp,root_category,category&order=timestamp.asc&limit=50000`;
    if (rootCategory) url += `&root_category=eq.${encodeURIComponent(rootCategory)}`;

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase error:', err);
      return res.status(500).json({ error: 'Failed to fetch snapshots' });
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(200).json({ trending: [], meta: { windowDays, totalAsins: 0 } });
    }

    // Group by ASIN
    const byAsin = {};
    for (const row of rows) {
      if (!row.bsr) continue; // skip rows with no BSR — can't rank movement
      if (category && row.category !== category) continue;
      if (!byAsin[row.asin]) byAsin[row.asin] = { snapshots: [], category: row.category, rootCategory: row.root_category };
      byAsin[row.asin].snapshots.push(row);
    }

    const results = [];

    for (const [asin, data] of Object.entries(byAsin)) {
      const snaps = data.snapshots; // already sorted asc

      // Split into baseline (before window) and recent (within window)
      const baseline = snaps.filter(s => s.timestamp < windowStart);
      const recent   = snaps.filter(s => s.timestamp >= windowStart);

      if (!recent.length) continue;

      const baselineSnap = baseline.length ? baseline[baseline.length - 1] : snaps[0];
      const latestSnap   = recent[recent.length - 1];

      if (!baselineSnap.bsr || !latestSnap.bsr) continue;

      const bsrDelta   = latestSnap.bsr - baselineSnap.bsr; // negative = improved rank
      const bsrPctMove = ((latestSnap.bsr - baselineSnap.bsr) / baselineSnap.bsr) * 100;

      // Price delta
      const priceDelta = (typeof latestSnap.price === 'number' && typeof baselineSnap.price === 'number')
        ? +(latestSnap.price - baselineSnap.price).toFixed(2)
        : null;

      // Review velocity in window
      const recentWithReviews = recent.filter(s => typeof s.reviews === 'number');
      let reviewsGained = null;
      if (recentWithReviews.length >= 2) {
        reviewsGained = recentWithReviews[recentWithReviews.length - 1].reviews - recentWithReviews[0].reviews;
      } else if (baseline.length) {
        const baseReviews = baseline.filter(s => typeof s.reviews === 'number');
        if (baseReviews.length && recentWithReviews.length) {
          reviewsGained = recentWithReviews[recentWithReviews.length - 1].reviews - baseReviews[baseReviews.length - 1].reviews;
        }
      }

      results.push({
        asin,
        category:     data.category    || null,
        rootCategory: data.rootCategory || null,
        bsr: {
          current:  latestSnap.bsr,
          baseline: baselineSnap.bsr,
          delta:    bsrDelta,
          pctMove:  +bsrPctMove.toFixed(1),
          improved: bsrDelta < 0
        },
        price: {
          current:  typeof latestSnap.price === 'number' ? latestSnap.price : null,
          delta:    priceDelta
        },
        reviewsGained,
        snapshotCount: snaps.length,
        lastSeen: latestSnap.timestamp
      });
    }

    // Sort by biggest BSR improvement (most negative delta = climbed highest)
    results.sort((a, b) => a.bsr.delta - b.bsr.delta);

    const trending  = results.filter(r => r.bsr.improved).slice(0, limit);
    const declining = results.filter(r => !r.bsr.improved).slice(-Math.min(limit, 10)).reverse();

    return res.status(200).json({
      trending,
      declining,
      meta: {
        windowDays,
        totalAsins: Object.keys(byAsin).length,
        generatedAt: Date.now()
      }
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
