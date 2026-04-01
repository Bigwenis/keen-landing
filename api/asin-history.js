export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { asin } = req.query;
  if (!asin) return res.status(400).json({ error: 'asin required' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/snapshots?asin=eq.${encodeURIComponent(asin)}&order=timestamp.asc&select=price,bsr,reviews,rating,sellers,timestamp`,
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
      return res.status(404).json({ error: 'No data found for this ASIN' });
    }

    // Aggregate: average by day bucket
    const byDay = {};
    for (const row of rows) {
      const day = new Date(row.timestamp).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { price: [], bsr: [], reviews: [], rating: [], sellers: [] };
      if (typeof row.price === 'number')   byDay[day].price.push(row.price);
      if (typeof row.bsr === 'number')     byDay[day].bsr.push(row.bsr);
      if (typeof row.reviews === 'number') byDay[day].reviews.push(row.reviews);
      if (typeof row.rating === 'number')  byDay[day].rating.push(row.rating);
      if (typeof row.sellers === 'number') byDay[day].sellers.push(row.sellers);
    }

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const history = Object.entries(byDay).map(([date, d]) => ({
      date,
      price:   avg(d.price)   !== null ? +avg(d.price).toFixed(2)   : null,
      bsr:     avg(d.bsr)     !== null ? Math.round(avg(d.bsr))      : null,
      reviews: avg(d.reviews) !== null ? Math.round(avg(d.reviews))  : null,
      rating:  avg(d.rating)  !== null ? +avg(d.rating).toFixed(2)   : null,
      sellers: avg(d.sellers) !== null ? Math.round(avg(d.sellers))  : null,
    }));

    const allPrices   = rows.filter(r => typeof r.price === 'number').map(r => r.price);
    const allBsr      = rows.filter(r => typeof r.bsr === 'number').map(r => r.bsr);
    const allReviews  = rows.filter(r => typeof r.reviews === 'number').map(r => r.reviews);

    return res.status(200).json({
      asin,
      snapshotCount: rows.length,
      trackerCount: null, // future: count distinct user IDs once auth is added
      summary: {
        price: allPrices.length ? {
          min: +Math.min(...allPrices).toFixed(2),
          max: +Math.max(...allPrices).toFixed(2),
          avg: +avg(allPrices).toFixed(2),
          current: +allPrices[allPrices.length - 1].toFixed(2)
        } : null,
        bsr: allBsr.length ? {
          min: Math.min(...allBsr),
          max: Math.max(...allBsr),
          avg: Math.round(avg(allBsr)),
          current: allBsr[allBsr.length - 1]
        } : null,
        reviews: allReviews.length ? {
          min: Math.min(...allReviews),
          max: Math.max(...allReviews),
          current: allReviews[allReviews.length - 1]
        } : null
      },
      history
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
