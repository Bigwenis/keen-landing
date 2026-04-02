// Returns all products tracked by a specific user
// GET /api/user-products?userId=xxx
// Queries snapshots table grouped by ASIN, returns latest data per product

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    // Fetch all snapshots for this user, latest first
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/snapshots?user_id=eq.${encodeURIComponent(userId)}&order=timestamp.desc&select=asin,title,brand,category,root_category,price,bsr,reviews,rating,sellers,timestamp&limit=2000`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );

    if (!response.ok) {
      console.error('Supabase error:', await response.text());
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    const rows = await response.json();

    // Group by ASIN — first row per ASIN is the latest (already ordered desc)
    const seen     = new Set();
    const products = [];

    for (const row of rows) {
      if (seen.has(row.asin)) continue;
      seen.add(row.asin);

      // Count total snapshots for this ASIN
      const snapCount = rows.filter(r => r.asin === row.asin).length;

      products.push({
        asin:          row.asin,
        title:         row.title         || null,
        brand:         row.brand         || null,
        category:      row.category      || null,
        rootCategory:  row.root_category || null,
        current: {
          price:   row.price,
          bsr:     row.bsr,
          reviews: row.reviews,
          rating:  row.rating,
          sellers: row.sellers
        },
        lastSeen:      row.timestamp,
        snapshotCount: snapCount
      });
    }

    // Sort by lastSeen desc
    products.sort((a, b) => b.lastSeen - a.lastSeen);

    return res.status(200).json({ products, total: products.length });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
