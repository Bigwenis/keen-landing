// Brand Intelligence endpoint
// GET /api/brand?brand=BrandName
// Returns all ASINs tracked for a brand with aggregated metrics and trends

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand } = req.query;
  if (!brand) return res.status(400).json({ error: 'brand required' });

  const SUPABASE_URL     = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    // Fetch all snapshots for this brand (case-insensitive via ilike)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/snapshots?brand=ilike.${encodeURIComponent(brand)}&order=timestamp.asc&select=asin,price,bsr,reviews,rating,sellers,title,category,root_category,timestamp&limit=50000`,
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
      return res.status(500).json({ error: 'Failed to fetch brand data' });
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(404).json({ error: 'No data found for this brand' });
    }

    // Group by ASIN
    const byAsin = {};
    for (const row of rows) {
      if (!byAsin[row.asin]) {
        byAsin[row.asin] = {
          asin:         row.asin,
          title:        row.title,
          category:     row.category,
          rootCategory: row.root_category,
          snapshots:    []
        };
      }
      if (row.title) byAsin[row.asin].title = row.title;
      byAsin[row.asin].snapshots.push(row);
    }

    const avg    = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const asins  = [];
    let totalSnapshotCount = 0;

    for (const [asin, data] of Object.entries(byAsin)) {
      const snaps   = data.snapshots;
      const first   = snaps[0];
      const latest  = snaps[snaps.length - 1];
      totalSnapshotCount += snaps.length;

      const prices  = snaps.filter(s => typeof s.price   === 'number').map(s => s.price);
      const bsrs    = snaps.filter(s => typeof s.bsr     === 'number').map(s => s.bsr);
      const reviews = snaps.filter(s => typeof s.reviews === 'number').map(s => s.reviews);
      const ratings = snaps.filter(s => typeof s.rating  === 'number').map(s => s.rating);

      // BSR trend
      const firstBsr  = snaps.find(s => typeof s.bsr === 'number');
      const latestBsr = [...snaps].reverse().find(s => typeof s.bsr === 'number');
      const bsrTrend  = (firstBsr && latestBsr && firstBsr !== latestBsr) ? {
        first:    firstBsr.bsr,
        current:  latestBsr.bsr,
        delta:    latestBsr.bsr - firstBsr.bsr,
        pctMove:  +((latestBsr.bsr - firstBsr.bsr) / firstBsr.bsr * 100).toFixed(1),
        improved: latestBsr.bsr < firstBsr.bsr
      } : null;

      // Price trend
      const firstPrice  = snaps.find(s => typeof s.price === 'number');
      const latestPrice = [...snaps].reverse().find(s => typeof s.price === 'number');
      const priceTrend  = (firstPrice && latestPrice && firstPrice !== latestPrice) ? {
        first:   firstPrice.price,
        current: latestPrice.price,
        delta:   +(latestPrice.price - firstPrice.price).toFixed(2)
      } : null;

      // Review velocity (reviews gained over tracked period)
      const firstReview  = snaps.find(s => typeof s.reviews === 'number');
      const latestReview = [...snaps].reverse().find(s => typeof s.reviews === 'number');
      let reviewVelocity = null;
      if (firstReview && latestReview && firstReview !== latestReview) {
        const daysTracked = Math.max(1, (latestReview.timestamp - firstReview.timestamp) / 86400000);
        const gained = latestReview.reviews - firstReview.reviews;
        reviewVelocity = {
          gained,
          perDay:  +(gained / daysTracked).toFixed(1),
          perWeek: +((gained / daysTracked) * 7).toFixed(0)
        };
      }

      asins.push({
        asin,
        title:         data.title,
        category:      data.category,
        rootCategory:  data.rootCategory,
        snapshotCount: snaps.length,
        firstSeen:     first.timestamp,
        lastSeen:      latest.timestamp,
        current: {
          price:   typeof latest.price   === 'number' ? latest.price   : null,
          bsr:     typeof latest.bsr     === 'number' ? latest.bsr     : null,
          reviews: typeof latest.reviews === 'number' ? latest.reviews : null,
          rating:  typeof latest.rating  === 'number' ? latest.rating  : null,
          sellers: typeof latest.sellers === 'number' ? latest.sellers : null
        },
        averages: {
          price:  prices.length  ? +avg(prices).toFixed(2)        : null,
          bsr:    bsrs.length    ? Math.round(avg(bsrs))          : null,
          rating: ratings.length ? +avg(ratings).toFixed(2)       : null
        },
        trends: {
          bsr:     bsrTrend,
          price:   priceTrend,
          reviews: reviewVelocity
        }
      });
    }

    // Sort by current BSR (best rank first)
    asins.sort((a, b) => {
      const aBsr = a.current.bsr || 9999999;
      const bBsr = b.current.bsr || 9999999;
      return aBsr - bBsr;
    });

    // Brand-level summary
    const allCurrentPrices  = asins.map(a => a.current.price).filter(v => typeof v === 'number');
    const allCurrentBsr     = asins.map(a => a.current.bsr).filter(v => typeof v === 'number');
    const allCurrentReviews = asins.map(a => a.current.reviews).filter(v => typeof v === 'number');

    const climbingAsins  = asins.filter(a => a.trends.bsr && a.trends.bsr.improved);
    const decliningAsins = asins.filter(a => a.trends.bsr && !a.trends.bsr.improved);

    return res.status(200).json({
      brand,
      asinCount: asins.length,
      totalSnapshotCount,
      summary: {
        price: allCurrentPrices.length ? {
          min: +Math.min(...allCurrentPrices).toFixed(2),
          max: +Math.max(...allCurrentPrices).toFixed(2),
          avg: +avg(allCurrentPrices).toFixed(2)
        } : null,
        bsr: allCurrentBsr.length ? {
          best:  Math.min(...allCurrentBsr),
          worst: Math.max(...allCurrentBsr),
          avg:   Math.round(avg(allCurrentBsr))
        } : null,
        totalReviews: allCurrentReviews.length ? allCurrentReviews.reduce((a, b) => a + b, 0) : null,
        climbingCount:  climbingAsins.length,
        decliningCount: decliningAsins.length
      },
      asins,
      generatedAt: Date.now()
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
