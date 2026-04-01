export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // windowDays: how far back to look (default 7, max 90)
  const windowDays = Math.min(parseInt(req.query.windowDays) || 7, 90);
  const topN        = Math.min(parseInt(req.query.topN) || 5, 20); // top N movers per category

  const SUPABASE_URL     = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const windowStart   = Date.now() - windowDays * 86400000;
  const lookbackStart = Date.now() - windowDays * 2 * 86400000;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/snapshots?timestamp=gte.${lookbackStart}&select=asin,bsr,price,reviews,timestamp,root_category,category,title&order=timestamp.asc&limit=50000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase error:', err);
      return res.status(500).json({ error: 'Failed to fetch snapshots' });
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(200).json({ categories: {}, meta: { windowDays, generatedAt: Date.now() } });
    }

    // Group snapshots by ASIN
    const byAsin = {};
    for (const row of rows) {
      if (!row.bsr) continue;
      if (!byAsin[row.asin]) {
        byAsin[row.asin] = {
          snapshots: [],
          rootCategory: row.root_category || 'Unknown',
          category: row.category || null,
          title: row.title || null
        };
      }
      byAsin[row.asin].snapshots.push(row);
      // Keep most recent title
      if (row.title) byAsin[row.asin].title = row.title;
    }

    // Compute delta per ASIN
    const asinStats = [];
    for (const [asin, data] of Object.entries(byAsin)) {
      const snaps    = data.snapshots;
      const baseline = snaps.filter(s => s.timestamp < windowStart);
      const recent   = snaps.filter(s => s.timestamp >= windowStart);

      if (!recent.length) continue;

      const baseSnap   = baseline.length ? baseline[baseline.length - 1] : snaps[0];
      const latestSnap = recent[recent.length - 1];

      if (!baseSnap.bsr || !latestSnap.bsr) continue;

      const bsrDelta  = latestSnap.bsr - baseSnap.bsr;
      const bsrPct    = +((bsrDelta / baseSnap.bsr) * 100).toFixed(1);

      const priceDelta = (typeof latestSnap.price === 'number' && typeof baseSnap.price === 'number')
        ? +(latestSnap.price - baseSnap.price).toFixed(2)
        : null;

      const recentReviews  = recent.filter(s => typeof s.reviews === 'number');
      const baselineReviews = baseline.filter(s => typeof s.reviews === 'number');
      let reviewsGained = null;
      if (recentReviews.length && baselineReviews.length) {
        reviewsGained = recentReviews[recentReviews.length - 1].reviews - baselineReviews[baselineReviews.length - 1].reviews;
      } else if (recentReviews.length >= 2) {
        reviewsGained = recentReviews[recentReviews.length - 1].reviews - recentReviews[0].reviews;
      }

      asinStats.push({
        asin,
        title:        data.title,
        rootCategory: data.rootCategory,
        category:     data.category,
        bsrCurrent:   latestSnap.bsr,
        bsrBaseline:  baseSnap.bsr,
        bsrDelta,
        bsrPct,
        priceCurrent: typeof latestSnap.price === 'number' ? latestSnap.price : null,
        priceDelta,
        reviewsGained,
        snapshotCount: snaps.length
      });
    }

    // Group by rootCategory and find top movers + top decliners per category
    const categoryMap = {};
    for (const stat of asinStats) {
      const cat = stat.rootCategory;
      if (!categoryMap[cat]) categoryMap[cat] = { climbers: [], decliners: [], asinCount: 0 };
      categoryMap[cat].asinCount++;
      if (stat.bsrDelta < 0) categoryMap[cat].climbers.push(stat);
      else                    categoryMap[cat].decliners.push(stat);
    }

    // Sort and trim each category
    const categories = {};
    for (const [cat, data] of Object.entries(categoryMap)) {
      data.climbers.sort((a, b) => a.bsrDelta - b.bsrDelta);   // most improved first
      data.decliners.sort((a, b) => b.bsrDelta - a.bsrDelta);  // most dropped first

      categories[cat] = {
        asinCount:  data.asinCount,
        climbers:   data.climbers.slice(0, topN).map(formatEntry),
        decliners:  data.decliners.slice(0, topN).map(formatEntry)
      };
    }

    return res.status(200).json({
      categories,
      meta: {
        windowDays,
        totalAsins: asinStats.length,
        categoryCount: Object.keys(categories).length,
        generatedAt: Date.now()
      }
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function formatEntry(s) {
  return {
    asin:          s.asin,
    title:         s.title,
    category:      s.category,
    bsr:           { current: s.bsrCurrent, baseline: s.bsrBaseline, delta: s.bsrDelta, pctMove: s.bsrPct },
    price:         { current: s.priceCurrent, delta: s.priceDelta },
    reviewsGained: s.reviewsGained,
    snapshotCount: s.snapshotCount
  };
}
